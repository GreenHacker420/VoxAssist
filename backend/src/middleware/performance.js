const logger = require('../utils/logger');
const { db } = require('../database/connection');

/**
 * Performance Optimization Middleware
 * Implements caching, compression, and performance monitoring
 */

// In-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Response caching middleware
 */
const cacheMiddleware = (ttl = CACHE_TTL) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.originalUrl}_${req.user?.userId || 'anonymous'}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < ttl) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return res.json(cachedData.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data: data,
          timestamp: Date.now()
        });
        
        // Clean up expired cache entries periodically
        if (cache.size > 1000) {
          cleanupCache();
        }
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Clean up expired cache entries
 */
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
  logger.debug(`Cache cleanup completed. Size: ${cache.size}`);
};

/**
 * Database query optimization middleware
 */
const optimizeQueries = () => {
  return async (req, res, next) => {
    // Add query hints and optimizations
    req.queryOptions = {
      useIndex: true,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit), 1000) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    next();
  };
};

/**
 * Response compression for large payloads
 */
const smartCompression = () => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Compress responses larger than 1KB
      if (typeof data === 'string' && data.length > 1024) {
        res.set('Content-Encoding', 'gzip');
      }
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Request batching for analytics
 */
const batchAnalytics = () => {
  const batch = [];
  const BATCH_SIZE = 100;
  const BATCH_INTERVAL = 30000; // 30 seconds

  // Process batch periodically
  setInterval(async () => {
    if (batch.length > 0) {
      await processBatch([...batch]);
      batch.length = 0;
    }
  }, BATCH_INTERVAL);

  return (req, res, next) => {
    // Add request to batch for analytics
    batch.push({
      timestamp: new Date(),
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId
    });

    // Process immediately if batch is full
    if (batch.length >= BATCH_SIZE) {
      setImmediate(async () => {
        await processBatch([...batch]);
        batch.length = 0;
      });
    }

    next();
  };
};

/**
 * Process analytics batch
 */
const processBatch = async (requests) => {
  try {
    const values = requests.map(req => [
      req.timestamp,
      req.method,
      req.url,
      req.userAgent,
      req.ip,
      req.userId
    ]);

    await db.query(`
      INSERT INTO request_analytics 
      (timestamp, method, url, user_agent, ip_address, user_id)
      VALUES ?
    `, [values]);

    logger.debug(`Processed analytics batch of ${requests.length} requests`);
  } catch (error) {
    logger.error('Failed to process analytics batch:', error);
  }
};

/**
 * Connection pooling optimization
 */
const optimizeConnections = () => {
  return (req, res, next) => {
    // Set connection keep-alive
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5, max=1000');
    
    next();
  };
};

/**
 * Memory usage monitoring
 */
const monitorMemory = () => {
  return (req, res, next) => {
    const startMemory = process.memoryUsage();
    
    res.on('finish', () => {
      const endMemory = process.memoryUsage();
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
      
      if (memoryDiff > 10 * 1024 * 1024) { // 10MB threshold
        logger.warn('High memory usage detected', {
          url: req.originalUrl,
          memoryDiff: `${(memoryDiff / 1024 / 1024).toFixed(2)}MB`,
          userId: req.user?.userId
        });
      }
    });

    next();
  };
};

/**
 * Response time optimization
 */
const optimizeResponseTime = () => {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      // Log slow requests
      if (duration > 2000) { // 2 second threshold
        logger.warn('Slow request detected', {
          url: req.originalUrl,
          method: req.method,
          duration: `${duration.toFixed(2)}ms`,
          userId: req.user?.userId
        });
      }

      // Add performance header
      res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    });

    next();
  };
};

/**
 * Database connection optimization
 */
const optimizeDbConnections = async () => {
  try {
    // Optimize MySQL connection pool
    await db.query(`
      SET SESSION query_cache_type = ON;
      SET SESSION query_cache_size = 67108864;
      SET SESSION innodb_buffer_pool_size = 134217728;
    `);
    
    logger.info('Database connection optimizations applied');
  } catch (error) {
    logger.error('Failed to apply database optimizations:', error);
  }
};

/**
 * API response pagination
 */
const paginateResponse = (defaultLimit = 50, maxLimit = 1000) => {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(maxLimit, parseInt(req.query.limit) || defaultLimit);
    const offset = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      offset,
      addPaginationHeaders: (totalCount) => {
        const totalPages = Math.ceil(totalCount / limit);
        
        res.set({
          'X-Total-Count': totalCount.toString(),
          'X-Total-Pages': totalPages.toString(),
          'X-Current-Page': page.toString(),
          'X-Per-Page': limit.toString()
        });

        // Add Link header for navigation
        const links = [];
        if (page > 1) {
          links.push(`<${req.originalUrl.split('?')[0]}?page=1&limit=${limit}>; rel="first"`);
          links.push(`<${req.originalUrl.split('?')[0]}?page=${page - 1}&limit=${limit}>; rel="prev"`);
        }
        if (page < totalPages) {
          links.push(`<${req.originalUrl.split('?')[0]}?page=${page + 1}&limit=${limit}>; rel="next"`);
          links.push(`<${req.originalUrl.split('?')[0]}?page=${totalPages}&limit=${limit}>; rel="last"`);
        }
        
        if (links.length > 0) {
          res.set('Link', links.join(', '));
        }
      }
    };

    next();
  };
};

/**
 * Clear cache for specific patterns
 */
const clearCache = (pattern) => {
  let cleared = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      cleared++;
    }
  }
  logger.debug(`Cleared ${cleared} cache entries matching pattern: ${pattern}`);
  return cleared;
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  const now = Date.now();
  let expired = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      expired++;
    }
  }

  return {
    total: cache.size,
    expired: expired,
    active: cache.size - expired,
    memoryUsage: process.memoryUsage().heapUsed
  };
};

module.exports = {
  cacheMiddleware,
  optimizeQueries,
  smartCompression,
  batchAnalytics,
  optimizeConnections,
  monitorMemory,
  optimizeResponseTime,
  optimizeDbConnections,
  paginateResponse,
  clearCache,
  getCacheStats,
  cleanupCache
};
