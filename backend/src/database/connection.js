const { Pool } = require('pg');
const redis = require('redis');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.pgPool = null;
    this.redisClient = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // PostgreSQL connection
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test PostgreSQL connection
      const client = await this.pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('PostgreSQL connected successfully');

      // Redis connection
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      await this.redisClient.connect();

      this.isConnected = true;
      logger.info('Database connections established');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
        logger.info('PostgreSQL disconnected');
      }
      
      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Redis disconnected');
      }
      
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from databases:', error);
    }
  }

  getPool() {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }
    return this.pgPool;
  }

  getRedis() {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient;
  }

  async query(text, params) {
    if (!this.pgPool) {
      throw new Error('Database not connected');
    }
    
    const start = Date.now();
    try {
      const res = await this.pgPool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    if (!this.pgPool) {
      throw new Error('Database not connected');
    }
    return await this.pgPool.connect();
  }

  // Redis helper methods
  async setCache(key, value, expireInSeconds = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redisClient.setEx(key, expireInSeconds, serializedValue);
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  async getCache(key) {
    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async deleteCache(key) {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  async setCachePattern(pattern, value, expireInSeconds = 3600) {
    try {
      const keys = await this.redisClient.keys(pattern);
      const pipeline = this.redisClient.multi();
      
      keys.forEach(key => {
        pipeline.setEx(key, expireInSeconds, JSON.stringify(value));
      });
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Redis pattern set error:', error);
    }
  }
}

const db = new DatabaseConnection();

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await db.connect();
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await db.disconnect();
  process.exit(0);
});

module.exports = {
  db,
  initializeDatabase
};
