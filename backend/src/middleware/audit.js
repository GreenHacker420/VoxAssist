const logger = require('../utils/logger');
const { db } = require('../database/connection');

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
    await db.query(`
      INSERT INTO audit_logs (
        user_id, session_id, event_type, event_category, 
        event_description, ip_address, user_agent, 
        resource_accessed, data_before, data_after,
        risk_level, compliance_flags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      auditData.userId || null,
      auditData.sessionId || null,
      auditData.eventType,
      auditData.eventCategory,
      auditData.eventDescription,
      auditData.ipAddress,
      auditData.userAgent,
      auditData.resourceAccessed || null,
      auditData.dataBefore ? JSON.stringify(auditData.dataBefore) : null,
      auditData.dataAfter ? JSON.stringify(auditData.dataAfter) : null,
      auditData.riskLevel || 'low',
      auditData.complianceFlags ? JSON.stringify(auditData.complianceFlags) : null
    ]);
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
    const query = `
      SELECT 
        event_type,
        event_category,
        risk_level,
        COUNT(*) as event_count,
        DATE(created_at) as event_date
      FROM audit_logs 
      WHERE created_at BETWEEN ? AND ?
        AND JSON_EXTRACT(compliance_flags, '$.${complianceType}') = true
      GROUP BY event_type, event_category, risk_level, DATE(created_at)
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
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
    // Detect multiple failed login attempts
    const failedLogins = await db.query(`
      SELECT ip_address, COUNT(*) as attempts
      FROM audit_logs 
      WHERE event_type LIKE '%login%' 
        AND event_description LIKE '%FAILED%'
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY ip_address
      HAVING attempts >= 5
    `);

    // Detect unusual data access patterns
    const unusualAccess = await db.query(`
      SELECT user_id, COUNT(*) as access_count
      FROM audit_logs 
      WHERE event_category = 'data_access'
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY user_id
      HAVING access_count > 100
    `);

    return {
      failedLogins: failedLogins.rows,
      unusualAccess: unusualAccess.rows
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
    const result = await db.query(`
      DELETE FROM audit_logs 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [retentionDays]);

    logger.info(`Cleaned up ${result.affectedRows} old audit log entries`);
    return result.affectedRows;
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
    const query = `
      SELECT * FROM audit_logs 
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [startDate, endDate]);
    
    if (format === 'csv') {
      // Convert to CSV format for compliance officers
      const csv = require('csv-stringify');
      return new Promise((resolve, reject) => {
        csv(result.rows, { header: true }, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
    }

    return result.rows;
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
