const mysql = require('mysql2/promise');
const redis = require('redis');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.mysqlPool = null;
    this.redisClient = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // MySQL connection
      this.mysqlPool = mysql.createPool({
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
      const connection = await this.mysqlPool.getConnection();
      await connection.query('SELECT NOW()');
      connection.release();
      logger.info('MySQL connected successfully');

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
      if (this.mysqlPool) {
        await this.mysqlPool.end();
        logger.info('MySQL disconnected');
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
    if (!this.mysqlPool) {
      throw new Error('MySQL pool not initialized');
    }
    return this.mysqlPool;
  }

  getRedis() {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient;
  }

  async query(text, params) {
    if (!this.mysqlPool) {
      throw new Error('Database not connected');
    }
    
    const start = Date.now();
    try {
      const [rows, fields] = await this.mysqlPool.execute(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: rows.length });
      return { rows, fields, rowCount: rows.length };
    } catch (error) {
      logger.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  async getConnection() {
    if (!this.mysqlPool) {
      throw new Error('Database not connected');
    }
    return await this.mysqlPool.getConnection();
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
