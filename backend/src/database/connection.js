const mysql = require('mysql2/promise');
const redis = require('redis');
const logger = require('../utils/logger');

/**
 * Database Connection - Functional Version
 * Manages MySQL and Redis connections
 */

// Module state
let mysqlPool = null;
let redisClient = null;
let isConnected = false;

/**
 * Connect to databases
 */
const connect = async () => {
  try {
    // MySQL connection
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voxassist',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test MySQL connection
    const connection = await mysqlPool.getConnection();
    await connection.query('SELECT NOW()');
    connection.release();
    logger.info('MySQL connected successfully');

    // Redis connection
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    await redisClient.connect();

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
    if (mysqlPool) {
      await mysqlPool.end();
      logger.info('MySQL disconnected');
    }
    
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
 * Get MySQL pool
 */
const getPool = () => {
  if (!mysqlPool) {
    throw new Error('MySQL pool not initialized');
  }
  return mysqlPool;
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
 * Execute MySQL query
 */
const query = async (text, params) => {
  if (!mysqlPool) {
    throw new Error('Database not connected');
  }
  
  const start = Date.now();
  try {
    const [rows, fields] = await mysqlPool.execute(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: rows.length });
    return rows; // Return rows directly for MySQL compatibility
  } catch (error) {
    logger.error('Query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Get MySQL connection
 */
const getConnection = async () => {
  if (!mysqlPool) {
    throw new Error('Database not connected');
  }
  return await mysqlPool.getConnection();
};

/**
 * Set cache value
 */
const setCache = async (key, value, expireInSeconds = 3600) => {
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
      query,
      getConnection,
      getPool,
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
  getPool,
  getRedis,
  setCache,
  getCache,
  deleteCache,
  setCachePattern,
  initializeDatabase,
  isConnected: () => isConnected
};
