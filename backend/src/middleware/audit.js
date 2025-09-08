const logger = require('../utils/logger');
const { prisma } = require('../database/prisma');

/**
 * Security Audit and Compliance Middleware
 * Tracks user actions, security events, and compliance requirements
 */

// Audit log levels
const AUDIT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  SECURITY: 'security'
};

// Event categories for compliance tracking
const EVENT_CATEGORIES = {
  AUTH: 'authentication',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SYSTEM: 'system',
  SECURITY: 'security',
  COMPLIANCE: 'compliance'
};

/**
 * Create audit log entry in database
 */
const createAuditLog = async (auditData) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: auditData.userId || null,
        action: auditData.eventType,
        resource: auditData.eventCategory,
        resourceId: auditData.resourceAccessed,
        details: {
          eventDescription: auditData.eventDescription,
          dataBefore: auditData.dataBefore,
          dataAfter: auditData.dataAfter,
          riskLevel: auditData.riskLevel || 'low',
          complianceFlags: auditData.complianceFlags
        },
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

/**
 * Authentication audit middleware
 */
const auditAuth = (eventType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Audit authentication events
      const auditData = {
        userId: req.user?.userId || null,
        sessionId: req.sessionID,
        eventType: eventType,
        eventCategory: EVENT_CATEGORIES.AUTH,
        eventDescription: `${eventType} attempt`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resourceAccessed: req.originalUrl,
        riskLevel: responseData.success ? 'low' : 'medium',
        complianceFlags: {
          gdpr: true,
          hipaa: eventType.includes('login'),
          pci: false
        }
      };

      if (!responseData.success) {
        auditData.riskLevel = 'high';
        auditData.eventDescription += ' - FAILED';
      }

      createAuditLog(auditData);
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Data access audit middleware
 */
const auditDataAccess = (resourceType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    const auditData = {
      userId: req.user?.userId || null,
      sessionId: req.sessionID,
      eventType: `${req.method.toLowerCase()}_${resourceType}`,
      eventCategory: EVENT_CATEGORIES.DATA_ACCESS,
      eventDescription: `Accessed ${resourceType} data`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      resourceAccessed: req.originalUrl,
      riskLevel: 'low',
      complianceFlags: {
        gdpr: true,
        hipaa: resourceType.includes('call') || resourceType.includes('user'),
        pci: resourceType.includes('payment')
      }
    };

    // Track response for audit
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      auditData.eventDescription += ` (${duration}ms)`;
      
      if (res.statusCode >= 400) {
        auditData.riskLevel = 'medium';
        auditData.eventDescription += ' - ERROR';
      }

      createAuditLog(auditData);
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Data modification audit middleware
 */
const auditDataModification = (resourceType) => {
  return async (req, res, next) => {
    let dataBefore = null;
    
    // Capture data before modification for certain operations
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // This would need to be customized based on the resource type
        // For now, we'll just log that we attempted to capture it
        dataBefore = { note: 'Data capture attempted' };
      } catch (error) {
        logger.warn('Could not capture data before modification:', error);
      }
    }

    const originalSend = res.send;
    res.send = function(data) {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      const auditData = {
        userId: req.user?.userId || null,
        sessionId: req.sessionID,
        eventType: `${req.method.toLowerCase()}_${resourceType}`,
        eventCategory: EVENT_CATEGORIES.DATA_MODIFICATION,
        eventDescription: `Modified ${resourceType} data`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resourceAccessed: req.originalUrl,
        dataBefore: dataBefore,
        dataAfter: responseData.success ? responseData.data : null,
        riskLevel: req.method === 'DELETE' ? 'high' : 'medium',
        complianceFlags: {
          gdpr: true,
          hipaa: resourceType.includes('call') || resourceType.includes('user'),
          pci: resourceType.includes('payment')
        }
      };

      if (!responseData.success) {
        auditData.riskLevel = 'high';
        auditData.eventDescription += ' - FAILED';
      }

      createAuditLog(auditData);
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Security event audit middleware
 */
const auditSecurityEvent = (eventType, riskLevel = 'medium') => {
  return async (req, res, next) => {
    const auditData = {
      userId: req.user?.userId || null,
      sessionId: req.sessionID,
      eventType: eventType,
      eventCategory: EVENT_CATEGORIES.SECURITY,
      eventDescription: `Security event: ${eventType}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      resourceAccessed: req.originalUrl,
      riskLevel: riskLevel,
      complianceFlags: {
        gdpr: true,
        hipaa: true,
        pci: true
      }
    };

    await createAuditLog(auditData);
    next();
  };
};

/**
 * Compliance reporting functions
 */
const generateComplianceReport = async (startDate, endDate, complianceType) => {
  try {
    const result = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        action: true,
        resource: true,
        details: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return result;
  } catch (error) {
    logger.error('Failed to generate compliance report:', error);
    throw error;
  }
};

/**
 * Security incident detection
 */
const detectSecurityIncidents = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Detect multiple failed login attempts
    const failedLogins = await prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        action: {
          contains: 'login'
        },
        details: {
          path: ['eventDescription'],
          string_contains: 'FAILED'
        },
        createdAt: {
          gt: oneHourAgo
        }
      },
      _count: {
        ipAddress: true
      },
      having: {
        ipAddress: {
          _count: {
            gte: 5
          }
        }
      }
    });

    // Detect unusual data access patterns
    const unusualAccess = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        resource: 'data_access',
        createdAt: {
          gt: oneHourAgo
        }
      },
      _count: {
        userId: true
      },
      having: {
        userId: {
          _count: {
            gt: 100
          }
        }
      }
    });

    return {
      failedLogins,
      unusualAccess
    };
  } catch (error) {
    logger.error('Failed to detect security incidents:', error);
    throw error;
  }
};

/**
 * Data retention compliance
 */
const cleanupOldAuditLogs = async (retentionDays = 2555) => { // 7 years default
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${result.count} old audit log entries`);
    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup old audit logs:', error);
    throw error;
  }
};

/**
 * Export audit logs for compliance
 */
const exportAuditLogs = async (startDate, endDate, format = 'json') => {
  try {
    const result = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (format === 'csv') {
      // Convert to CSV format for compliance officers
      const csv = require('csv-stringify');
      return new Promise((resolve, reject) => {
        csv(result, { header: true }, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to export audit logs:', error);
    throw error;
  }
};

module.exports = {
  auditAuth,
  auditDataAccess,
  auditDataModification,
  auditSecurityEvent,
  generateComplianceReport,
  detectSecurityIncidents,
  cleanupOldAuditLogs,
  exportAuditLogs,
  AUDIT_LEVELS,
  EVENT_CATEGORIES
};
