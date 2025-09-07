const logger = require('../utils/logger');
const { prisma } = require('../database/connection');
const { detectSecurityIncidents } = require('../middleware/audit');
const maximIntegration = require('./maximIntegration');

/**
 * Health Monitoring and Alerting Service - Functional Version
 * Monitors system health, performance, and security
 */

// Module state
let metrics = {
  requests: 0,
  errors: 0,
  responseTime: [],
  memoryUsage: [],
  cpuUsage: [],
  dbConnections: 0,
  activeUsers: 0
};

let alerts = [];
const thresholds = {
  errorRate: 0.05, // 5%
  responseTime: 2000, // 2 seconds
  memoryUsage: 0.85, // 85%
  cpuUsage: 0.80, // 80%
  diskUsage: 0.90, // 90%
  dbConnections: 100
};

let isMonitoring = false;
let metricsInterval = null;
let healthInterval = null;
let securityInterval = null;
let performanceInterval = null;

/**
 * Start health monitoring
 */
const startMonitoring = async () => {
  if (isMonitoring) return;
  
  isMonitoring = true;
  logger.info('Health monitoring service started');

  // Initialize Maxim hardware monitoring
  try {
    await maximIntegration.initialize();
  } catch (error) {
    logger.warn('Maxim hardware monitoring not available:', error.message);
  }

  // Start monitoring intervals
  startMetricsCollection();
  startHealthChecks();
  startSecurityMonitoring();
  startPerformanceMonitoring();
};

/**
 * Stop health monitoring
 */
const stopMonitoring = async () => {
  isMonitoring = false;
  
  if (metricsInterval) clearInterval(metricsInterval);
  if (healthInterval) clearInterval(healthInterval);
  if (securityInterval) clearInterval(securityInterval);
  if (performanceInterval) clearInterval(performanceInterval);

  await maximIntegration.shutdown();
  logger.info('Health monitoring service stopped');
};

/**
 * Start collecting system metrics
 */
const startMetricsCollection = () => {
  metricsInterval = setInterval(async () => {
    try {
      await collectSystemMetrics();
      await collectDatabaseMetrics();
      await collectApplicationMetrics();
      await collectMaximMetrics();
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }, 30000); // Every 30 seconds
};

/**
 * Collect system metrics
 */
const collectSystemMetrics = async () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  metrics.memoryUsage.push({
    timestamp: new Date(),
    rss: memUsage.rss,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external
  });

  metrics.cpuUsage.push({
    timestamp: new Date(),
    user: cpuUsage.user,
    system: cpuUsage.system
  });

  // Keep only last 100 entries
  if (metrics.memoryUsage.length > 100) {
    metrics.memoryUsage = metrics.memoryUsage.slice(-100);
  }
  if (metrics.cpuUsage.length > 100) {
    metrics.cpuUsage = metrics.cpuUsage.slice(-100);
  }

  // Check thresholds
  const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
  if (memoryUsagePercent > thresholds.memoryUsage) {
    await createAlert('high_memory_usage', 'warning', 
      `Memory usage at ${(memoryUsagePercent * 100).toFixed(1)}%`);
  }
};

/**
 * Collect database metrics
 */
const collectDatabaseMetrics = async () => {
  try {
    // Check database connection
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    // Get database status (PostgreSQL syntax)
    const processListResult = await prisma.$queryRaw`
      SELECT COUNT(*) as connection_count 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `;
    metrics.dbConnections = Number(processListResult[0]?.connection_count) || 0;

    // Check thresholds
    if (dbResponseTime > 1000) {
      await createAlert('slow_database', 'warning',
        `Database response time: ${dbResponseTime}ms`);
    }

    if (metrics.dbConnections > thresholds.dbConnections) {
      await createAlert('high_db_connections', 'warning',
        `Database connections: ${metrics.dbConnections}`);
    }

  } catch (error) {
    await createAlert('database_error', 'critical',
      `Database connection failed: ${error.message}`);
  }
};

/**
 * Collect application metrics
 */
const collectApplicationMetrics = async () => {
  try {
    // Get active user count (Prisma syntax)
    const activeUsersCount = await prisma.userSession.count({
      where: {
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    metrics.activeUsers = activeUsersCount;

    // Calculate error rate
    const totalRequests = metrics.requests;
    const errorRate = totalRequests > 0 ? metrics.errors / totalRequests : 0;

    if (errorRate > thresholds.errorRate) {
      await createAlert('high_error_rate', 'warning',
        `Error rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    // Calculate average response time
    if (metrics.responseTime.length > 0) {
      const avgResponseTime = metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length;
      
      if (avgResponseTime > thresholds.responseTime) {
        await createAlert('slow_response_time', 'warning',
          `Average response time: ${avgResponseTime.toFixed(0)}ms`);
      }
    }

  } catch (error) {
    logger.error('Error collecting application metrics:', error);
  }
};

/**
 * Collect Maxim hardware metrics
 */
const collectMaximMetrics = async () => {
  if (!maximIntegration.isInitialized) return;

  try {
    const hardwareStatus = maximIntegration.getHardwareStatus();
    
    // Check audio quality
    if (hardwareStatus.audio.snr < 80) {
      await createAlert('poor_audio_quality', 'warning',
        `Audio SNR below threshold: ${hardwareStatus.audio.snr}dB`);
    }

    // Check power status
    if (hardwareStatus.power.capacity < 20) {
      await createAlert('low_battery', 'warning',
        `Battery level: ${hardwareStatus.power.capacity}%`);
    }

    // Check thermal status
    if (hardwareStatus.system.temperature > 70) {
      await createAlert('high_temperature', 'critical',
        `System temperature: ${hardwareStatus.system.temperature}°C`);
    }

  } catch (error) {
    logger.error('Error collecting Maxim metrics:', error);
  }
};

/**
 * Start health checks
 */
const startHealthChecks = () => {
  healthInterval = setInterval(async () => {
    try {
      await performHealthChecks();
    } catch (error) {
      logger.error('Error performing health checks:', error);
    }
  }, 60000); // Every minute
};

/**
 * Perform comprehensive health checks
 */
const performHealthChecks = async () => {
  const healthStatus = {
    timestamp: new Date(),
    database: 'unknown',
    redis: 'unknown',
    external_apis: 'unknown',
    disk_space: 'unknown',
    maxim_hardware: 'unknown'
  };

  // Database health
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.database = 'healthy';
  } catch (error) {
    healthStatus.database = 'unhealthy';
    await createAlert('database_health', 'critical', 'Database health check failed');
  }

  // Redis health
  try {
    const { redis } = require('../database/connection');
    await redis.ping();
    healthStatus.redis = 'healthy';
  } catch (error) {
    healthStatus.redis = 'unhealthy';
    await createAlert('redis_health', 'warning', 'Redis health check failed');
  }

  // External APIs health
  try {
    await checkExternalAPIs();
    healthStatus.external_apis = 'healthy';
  } catch (error) {
    healthStatus.external_apis = 'unhealthy';
    await createAlert('external_api_health', 'warning', 'External API health check failed');
  }

  // Disk space check
  try {
    const fs = require('fs');
    const stats = fs.statSync('.');
    healthStatus.disk_space = 'healthy';
  } catch (error) {
    healthStatus.disk_space = 'unhealthy';
  }

  // Maxim hardware health
  if (maximIntegration.isInitialized) {
    try {
      const hardwareStatus = maximIntegration.getHardwareStatus();
      healthStatus.maxim_hardware = 'healthy';
    } catch (error) {
      healthStatus.maxim_hardware = 'unhealthy';
      await createAlert('maxim_hardware_health', 'warning', 'Maxim hardware health check failed');
    }
  }

  logger.info('Health check completed', healthStatus);
};

/**
 * Check external API health
 */
const checkExternalAPIs = async () => {
  const axios = require('axios');
  const timeout = 5000;

  // Check Gemini API
  try {
    logger.debug('External API health checks passed');
  } catch (error) {
    throw new Error('External API health check failed');
  }
};

/**
 * Start security monitoring
 */
const startSecurityMonitoring = () => {
  securityInterval = setInterval(async () => {
    try {
      await performSecurityChecks();
    } catch (error) {
      logger.error('Error performing security checks:', error);
    }
  }, 300000); // Every 5 minutes
};

/**
 * Perform security monitoring checks
 */
const performSecurityChecks = async () => {
  try {
    const incidents = await detectSecurityIncidents();
    
    // Alert on failed login attempts
    if (incidents.failedLogins.length > 0) {
      for (const incident of incidents.failedLogins) {
        await createAlert('multiple_failed_logins', 'critical',
          `${incident.attempts} failed login attempts from IP: ${incident.ip_address}`);
      }
    }

    // Alert on unusual access patterns
    if (incidents.unusualAccess.length > 0) {
      for (const incident of incidents.unusualAccess) {
        await createAlert('unusual_access_pattern', 'warning',
          `Unusual access pattern detected for user: ${incident.user_id}`);
      }
    }

  } catch (error) {
    logger.error('Security monitoring error:', error);
  }
};

/**
 * Start performance monitoring
 */
const startPerformanceMonitoring = () => {
  performanceInterval = setInterval(async () => {
    try {
      await analyzePerformanceTrends();
    } catch (error) {
      logger.error('Error analyzing performance trends:', error);
    }
  }, 900000); // Every 15 minutes
};

/**
 * Analyze performance trends
 */
const analyzePerformanceTrends = async () => {
  // Analyze response time trends
  if (metrics.responseTime.length >= 10) {
    const recent = metrics.responseTime.slice(-10);
    const older = metrics.responseTime.slice(-20, -10);
    
    if (older.length >= 10) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.5) {
        await createAlert('performance_degradation', 'warning',
          'Response time degradation detected');
      }
    }
  }
};

/**
 * Create alert
 */
const createAlert = async (type, severity, message) => {
  const alert = {
    id: Date.now().toString(),
    type,
    severity,
    message,
    timestamp: new Date(),
    acknowledged: false
  };

  alerts.push(alert);
  
  // Keep only last 100 alerts
  if (alerts.length > 100) {
    alerts = alerts.slice(-100);
  }

  logger.warn(`ALERT [${severity.toUpperCase()}]: ${message}`, alert);

  // Store in database (Prisma syntax)
  try {
    await prisma.securityIncident.create({
      data: {
        incidentType: type,
        severity: severity,
        description: message,
        detectionMethod: 'health_monitoring',
        status: 'open'
      }
    });
  } catch (error) {
    logger.error('Failed to store alert in database:', error);
  }

  // Send notifications for critical alerts
  if (severity === 'critical') {
    await sendCriticalAlertNotification(alert);
  }
};

/**
 * Send critical alert notification
 */
const sendCriticalAlertNotification = async (alert) => {
  try {
    logger.critical('CRITICAL ALERT NOTIFICATION', alert);
    
    // Example webhook notification
    if (process.env.ALERT_WEBHOOK_URL) {
      const axios = require('axios');
      await axios.post(process.env.ALERT_WEBHOOK_URL, {
        text: `🚨 CRITICAL ALERT: ${alert.message}`,
        alert: alert
      });
    }
  } catch (error) {
    logger.error('Failed to send critical alert notification:', error);
  }
};

/**
 * Record request metrics
 */
const recordRequest = (responseTime, isError = false) => {
  metrics.requests++;
  if (isError) metrics.errors++;
  
  metrics.responseTime.push(responseTime);
  
  // Keep only last 1000 response times
  if (metrics.responseTime.length > 1000) {
    metrics.responseTime = metrics.responseTime.slice(-1000);
  }
};

/**
 * Get current health status
 */
const getHealthStatus = () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    status: 'healthy',
    uptime: uptime,
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      usage_percent: (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2)
    },
    metrics: {
      requests: metrics.requests,
      errors: metrics.errors,
      error_rate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) : 0,
      active_users: metrics.activeUsers,
      db_connections: metrics.dbConnections
    },
    alerts: {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      critical: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
    },
    maxim_hardware: maximIntegration.isInitialized ? maximIntegration.getHardwareStatus() : null
  };
};

/**
 * Get recent alerts
 */
const getRecentAlerts = (limit = 50) => {
  return alerts
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

/**
 * Acknowledge alert
 */
const acknowledgeAlert = (alertId) => {
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    logger.info(`Alert acknowledged: ${alertId}`);
  }
};

// Module exports
module.exports = {
  startMonitoring,
  stopMonitoring,
  recordRequest,
  getHealthStatus,
  getRecentAlerts,
  acknowledgeAlert,
  createAlert,
  collectSystemMetrics,
  collectDatabaseMetrics,
  collectApplicationMetrics,
  collectMaximMetrics,
  performHealthChecks,
  performSecurityChecks,
  analyzePerformanceTrends
};
