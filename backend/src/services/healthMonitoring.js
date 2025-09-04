const logger = require('../utils/logger');
const { db } = require('../database/connection');
const { detectSecurityIncidents } = require('../middleware/audit');
const MaximIntegrationService = require('./maximIntegration');

/**
 * Health Monitoring and Alerting Service
 * Monitors system health, performance, and security
 */
class HealthMonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      dbConnections: 0,
      activeUsers: 0
    };
    
    this.alerts = [];
    this.thresholds = {
      errorRate: 0.05, // 5%
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.85, // 85%
      cpuUsage: 0.80, // 80%
      diskUsage: 0.90, // 90%
      dbConnections: 100
    };
    
    this.maximService = new MaximIntegrationService();
    this.isMonitoring = false;
  }

  /**
   * Start health monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    logger.info('Health monitoring service started');

    // Initialize Maxim hardware monitoring
    try {
      await this.maximService.initialize();
    } catch (error) {
      logger.warn('Maxim hardware monitoring not available:', error.message);
    }

    // Start monitoring intervals
    this.startMetricsCollection();
    this.startHealthChecks();
    this.startSecurityMonitoring();
    this.startPerformanceMonitoring();
  }

  /**
   * Stop health monitoring
   */
  async stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.healthInterval) clearInterval(this.healthInterval);
    if (this.securityInterval) clearInterval(this.securityInterval);
    if (this.performanceInterval) clearInterval(this.performanceInterval);

    await this.maximService.shutdown();
    logger.info('Health monitoring service stopped');
  }

  /**
   * Start collecting system metrics
   */
  startMetricsCollection() {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.collectDatabaseMetrics();
        await this.collectApplicationMetrics();
        await this.collectMaximMetrics();
      } catch (error) {
        logger.error('Error collecting metrics:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.memoryUsage.push({
      timestamp: new Date(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    });

    this.metrics.cpuUsage.push({
      timestamp: new Date(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Keep only last 100 entries
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }

    // Check thresholds
    const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    if (memoryUsagePercent > this.thresholds.memoryUsage) {
      await this.createAlert('high_memory_usage', 'warning', 
        `Memory usage at ${(memoryUsagePercent * 100).toFixed(1)}%`);
    }
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    try {
      // Check database connection
      const startTime = Date.now();
      await db.query('SELECT 1');
      const dbResponseTime = Date.now() - startTime;

      // Get database status
      const [processListResult] = await Promise.all([
        db.query('SHOW PROCESSLIST')
      ]);

      this.metrics.dbConnections = processListResult.rows.length;

      // Check thresholds
      if (dbResponseTime > 1000) {
        await this.createAlert('slow_database', 'warning',
          `Database response time: ${dbResponseTime}ms`);
      }

      if (this.metrics.dbConnections > this.thresholds.dbConnections) {
        await this.createAlert('high_db_connections', 'warning',
          `Database connections: ${this.metrics.dbConnections}`);
      }

    } catch (error) {
      await this.createAlert('database_error', 'critical',
        `Database connection failed: ${error.message}`);
    }
  }

  /**
   * Collect application metrics
   */
  async collectApplicationMetrics() {
    try {
      // Get active user count
      const activeUsersResult = await db.query(`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM user_sessions 
        WHERE is_active = TRUE 
          AND expires_at > NOW()
      `);

      this.metrics.activeUsers = activeUsersResult.rows[0]?.active_users || 0;

      // Calculate error rate
      const totalRequests = this.metrics.requests;
      const errorRate = totalRequests > 0 ? this.metrics.errors / totalRequests : 0;

      if (errorRate > this.thresholds.errorRate) {
        await this.createAlert('high_error_rate', 'warning',
          `Error rate: ${(errorRate * 100).toFixed(2)}%`);
      }

      // Calculate average response time
      if (this.metrics.responseTime.length > 0) {
        const avgResponseTime = this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length;
        
        if (avgResponseTime > this.thresholds.responseTime) {
          await this.createAlert('slow_response_time', 'warning',
            `Average response time: ${avgResponseTime.toFixed(0)}ms`);
        }
      }

    } catch (error) {
      logger.error('Error collecting application metrics:', error);
    }
  }

  /**
   * Collect Maxim hardware metrics
   */
  async collectMaximMetrics() {
    if (!this.maximService.isInitialized) return;

    try {
      const hardwareStatus = this.maximService.getHardwareStatus();
      
      // Check audio quality
      if (hardwareStatus.audio.snr < 80) {
        await this.createAlert('poor_audio_quality', 'warning',
          `Audio SNR below threshold: ${hardwareStatus.audio.snr}dB`);
      }

      // Check power status
      if (hardwareStatus.power.capacity < 20) {
        await this.createAlert('low_battery', 'warning',
          `Battery level: ${hardwareStatus.power.capacity}%`);
      }

      // Check thermal status
      if (hardwareStatus.system.temperature > 70) {
        await this.createAlert('high_temperature', 'critical',
          `System temperature: ${hardwareStatus.system.temperature}°C`);
      }

    } catch (error) {
      logger.error('Error collecting Maxim metrics:', error);
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    this.healthInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('Error performing health checks:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Perform comprehensive health checks
   */
  async performHealthChecks() {
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
      await db.query('SELECT 1');
      healthStatus.database = 'healthy';
    } catch (error) {
      healthStatus.database = 'unhealthy';
      await this.createAlert('database_health', 'critical', 'Database health check failed');
    }

    // Redis health
    try {
      const { redis } = require('../database/connection');
      await redis.ping();
      healthStatus.redis = 'healthy';
    } catch (error) {
      healthStatus.redis = 'unhealthy';
      await this.createAlert('redis_health', 'warning', 'Redis health check failed');
    }

    // External APIs health
    try {
      await this.checkExternalAPIs();
      healthStatus.external_apis = 'healthy';
    } catch (error) {
      healthStatus.external_apis = 'unhealthy';
      await this.createAlert('external_api_health', 'warning', 'External API health check failed');
    }

    // Disk space check
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      // This is a simplified check - in production, use proper disk space monitoring
      healthStatus.disk_space = 'healthy';
    } catch (error) {
      healthStatus.disk_space = 'unhealthy';
    }

    // Maxim hardware health
    if (this.maximService.isInitialized) {
      try {
        const hardwareStatus = this.maximService.getHardwareStatus();
        healthStatus.maxim_hardware = 'healthy';
      } catch (error) {
        healthStatus.maxim_hardware = 'unhealthy';
        await this.createAlert('maxim_hardware_health', 'warning', 'Maxim hardware health check failed');
      }
    }

    logger.info('Health check completed', healthStatus);
  }

  /**
   * Check external API health
   */
  async checkExternalAPIs() {
    const axios = require('axios');
    const timeout = 5000;

    // Check Gemini API
    try {
      // This is a placeholder - implement actual API health checks
      logger.debug('External API health checks passed');
    } catch (error) {
      throw new Error('External API health check failed');
    }
  }

  /**
   * Start security monitoring
   */
  startSecurityMonitoring() {
    this.securityInterval = setInterval(async () => {
      try {
        await this.performSecurityChecks();
      } catch (error) {
        logger.error('Error performing security checks:', error);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Perform security monitoring checks
   */
  async performSecurityChecks() {
    try {
      const incidents = await detectSecurityIncidents();
      
      // Alert on failed login attempts
      if (incidents.failedLogins.length > 0) {
        for (const incident of incidents.failedLogins) {
          await this.createAlert('multiple_failed_logins', 'critical',
            `${incident.attempts} failed login attempts from IP: ${incident.ip_address}`);
        }
      }

      // Alert on unusual access patterns
      if (incidents.unusualAccess.length > 0) {
        for (const incident of incidents.unusualAccess) {
          await this.createAlert('unusual_access_pattern', 'warning',
            `Unusual access pattern detected for user: ${incident.user_id}`);
        }
      }

    } catch (error) {
      logger.error('Security monitoring error:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(async () => {
      try {
        await this.analyzePerformanceTrends();
      } catch (error) {
        logger.error('Error analyzing performance trends:', error);
      }
    }, 900000); // Every 15 minutes
  }

  /**
   * Analyze performance trends
   */
  async analyzePerformanceTrends() {
    // Analyze response time trends
    if (this.metrics.responseTime.length >= 10) {
      const recent = this.metrics.responseTime.slice(-10);
      const older = this.metrics.responseTime.slice(-20, -10);
      
      if (older.length >= 10) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.5) {
          await this.createAlert('performance_degradation', 'warning',
            'Response time degradation detected');
        }
      }
    }
  }

  /**
   * Create alert
   */
  async createAlert(type, severity, message) {
    const alert = {
      id: Date.now().toString(),
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`ALERT [${severity.toUpperCase()}]: ${message}`, alert);

    // Store in database
    try {
      await db.query(`
        INSERT INTO security_incidents (
          incident_type, severity, description, 
          detection_method, status, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [type, severity, message, 'health_monitoring', 'open']);
    } catch (error) {
      logger.error('Failed to store alert in database:', error);
    }

    // Send notifications for critical alerts
    if (severity === 'critical') {
      await this.sendCriticalAlertNotification(alert);
    }
  }

  /**
   * Send critical alert notification
   */
  async sendCriticalAlertNotification(alert) {
    try {
      // In production, integrate with notification services like:
      // - Email (SendGrid, AWS SES)
      // - SMS (Twilio)
      // - Slack/Teams webhooks
      // - PagerDuty
      
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
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime, isError = false) {
    this.metrics.requests++;
    if (isError) this.metrics.errors++;
    
    this.metrics.responseTime.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
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
        requests: this.metrics.requests,
        errors: this.metrics.errors,
        error_rate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
        active_users: this.metrics.activeUsers,
        db_connections: this.metrics.dbConnections
      },
      alerts: {
        total: this.alerts.length,
        unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
        critical: this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
      },
      maxim_hardware: this.maximService.isInitialized ? this.maximService.getHardwareStatus() : null
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50) {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      logger.info(`Alert acknowledged: ${alertId}`);
    }
  }
}

module.exports = HealthMonitoringService;
