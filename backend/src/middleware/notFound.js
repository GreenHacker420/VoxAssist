const logger = require('../utils/logger');

/**
 * 404 Not Found middleware
 * Handles requests to non-existent routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl
  });
  
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `The requested resource ${req.originalUrl} was not found on this server.`,
    timestamp: new Date().toISOString()
  });
};

module.exports = notFound;
