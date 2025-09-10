const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Demo-aware authentication middleware
 * Handles both real authenticated users and demo mode users
 */
const authenticateTokenOrDemo = (req, res, next) => {
  try {
    // Check for demo mode header first
    const isDemoMode = req.headers['x-demo-mode'] === 'true';
    
    if (isDemoMode) {
      // Handle demo mode user
      req.user = {
        userId: 999999,
        email: 'demo@voxassist.com',
        role: 'user',
        organizationId: 1,
        isDemoMode: true
      };
      
      logger.info('Demo mode user authenticated for demo calls');
      return next();
    }

    // Handle regular authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn(`Invalid token attempt: ${err.message}`);
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      req.user = user;
      next();
    });

  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Demo mode only middleware
 * Only allows demo mode users
 */
const demoModeOnly = (req, res, next) => {
  const isDemoMode = req.headers['x-demo-mode'] === 'true';
  
  if (!isDemoMode) {
    return res.status(403).json({
      success: false,
      error: 'This endpoint is only available in demo mode'
    });
  }

  req.user = {
    userId: 999999,
    email: 'demo@voxassist.com',
    role: 'user',
    organizationId: 1,
    isDemoMode: true
  };

  logger.info('Demo mode only access granted');
  next();
};

/**
 * Check if request is from demo mode
 */
const isDemoRequest = (req) => {
  return req.headers['x-demo-mode'] === 'true' || req.user?.isDemoMode === true;
};

module.exports = {
  authenticateTokenOrDemo,
  demoModeOnly,
  isDemoRequest
};
