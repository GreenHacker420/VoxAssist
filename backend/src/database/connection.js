const { prisma, initializeDatabase: initPrisma, disconnectDatabase } = require('./prisma');
const redis = require('redis');
const logger = require('../utils/logger');

/**
 * Database Connection - Functional Version
 * Manages PostgreSQL via Prisma and Redis connections
 */

// Module state
let redisClient = null;
let isConnected = false;

/**
 * Connect to databases
 */
const connect = async () => {
  try {
    // Initialize Prisma (PostgreSQL)
    await initPrisma();
    logger.info('PostgreSQL connected successfully via Prisma');

    // Redis connection (optional)
    try {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000,
          lazyConnect: true
        }
      });

      redisClient.on('error', (err) => {
        // Suppress repeated connection errors
        if (!err.message.includes('ECONNREFUSED')) {
          logger.warn('Redis Client Error (non-critical):', err.message);
        }
      });

      redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      // Try to connect with timeout
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache:', error.message);
      redisClient = null;
    }

    isConnected = true;
    logger.info('Database connections established');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from databases
 */
const disconnect = async () => {
  try {
    await disconnectDatabase();
    logger.info('PostgreSQL disconnected');
    
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected');
    }
    
    isConnected = false;
  } catch (error) {
    logger.error('Error disconnecting from databases:', error);
  }
};

/**
 * Get Prisma client
 */
const getPrisma = () => {
  return prisma;
};

/**
 * Get Redis client
 */
const getRedis = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

/**
 * Execute raw query (for compatibility)
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await prisma.$queryRawUnsafe(text, ...params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration });
    return result;
  } catch (error) {
    logger.error('Query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Get database instance (Prisma client)
 */
const getConnection = () => {
  return prisma;
};

/**
 * Set cache value
 */
const setCache = async (key, value, expireInSeconds = 3600) => {
  if (!redisClient) {
    logger.debug('Redis not available, skipping cache set');
    return;
  }
  try {
    const serializedValue = JSON.stringify(value);
    await redisClient.setEx(key, expireInSeconds, serializedValue);
  } catch (error) {
    logger.error('Redis set error:', error);
  }
};

/**
 * Get cache value
 */
const getCache = async (key) => {
  if (!redisClient) {
    logger.debug('Redis not available, returning null from cache');
    return null;
  }
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

/**
 * Delete cache value
 */
const deleteCache = async (key) => {
  if (!redisClient) {
    logger.debug('Redis not available, skipping cache delete');
    return;
  }
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
  }
};

/**
 * Set cache pattern
 */
const setCachePattern = async (pattern, value, expireInSeconds = 3600) => {
  if (!redisClient) {
    logger.debug('Redis not available, skipping cache pattern set');
    return;
  }
  try {
    const keys = await redisClient.keys(pattern);
    const pipeline = redisClient.multi();
    
    keys.forEach(key => {
      pipeline.setEx(key, expireInSeconds, JSON.stringify(value));
    });
    
    await pipeline.exec();
  } catch (error) {
    logger.error('Redis pattern set error:', error);
  }
};

/**
 * Initialize database connection
 */
const initializeDatabase = async () => {
  try {
    await connect();
    return {
      prisma,
      query,
      getConnection,
      getPrisma,
      getRedis,
      setCache,
      getCache,
      deleteCache,
      setCachePattern,
      disconnect,
      isConnected: () => isConnected
    };
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await disconnect();
  process.exit(0);
});

// Module exports
module.exports = {
  connect,
  disconnect,
  query,
  getConnection,
  getPrisma,
  getRedis,
  setCache,
  getCache,
  deleteCache,
  setCachePattern,
  initializeDatabase,
  isConnected: () => isConnected,
  prisma,
  db: prisma // Alias for backward compatibility
};
