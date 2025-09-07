const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const db = require('../database/connection');
const advancedAnalytics = require('../services/advancedAnalytics');
const callQualityMonitoring = require('../services/callQualityMonitoring');
const healthMonitoring = require('../services/healthMonitoring');

// Mobile dashboard overview
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    
    // Get real-time metrics
    const dashboard = await advancedAnalytics.getRealTimeDashboard(organizationId);
    
    // Get today's key metrics
    const todayQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_calls,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_calls,
        AVG(satisfaction_score) as avg_satisfaction,
        AVG(duration) as avg_duration
      FROM calls 
      WHERE organization_id = ? AND DATE(start_time) = CURDATE()
    `;
    
    const todayResult = await db.query(todayQuery, [organizationId]);
    const todayMetrics = todayResult[0];

    // Get system health
    const systemHealth = healthMonitoring.getHealthStatus();
    
    // Get recent alerts
    const alertsQuery = `
      SELECT type, message, severity, created_at
      FROM system_alerts 
      WHERE organization_id = ? 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const alertsResult = await db.query(alertsQuery, [organizationId]);

    const mobileData = {
      overview: {
        totalCalls: todayMetrics.total_calls || 0,
        activeCalls: todayMetrics.active_calls || 0,
        completedCalls: todayMetrics.completed_calls || 0,
        escalatedCalls: todayMetrics.escalated_calls || 0,
        resolutionRate: todayMetrics.total_calls > 0 ? 
          ((todayMetrics.completed_calls / todayMetrics.total_calls) * 100).toFixed(1) : 0,
        avgSatisfaction: todayMetrics.avg_satisfaction?.toFixed(1) || 'N/A',
        avgDuration: Math.round(todayMetrics.avg_duration || 0)
      },
      systemHealth: {
        status: systemHealth.overall?.status || 'unknown',
        uptime: systemHealth.system?.uptime || 0,
        memoryUsage: systemHealth.system?.memoryUsage || 0,
        cpuUsage: systemHealth.system?.cpuUsage || 0
      },
      recentAlerts: alertsResult.map(alert => ({
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        time: alert.created_at
      })),
      trends: dashboard.trends?.hourly || []
    };

    res.json({ success: true, data: mobileData });
  } catch (error) {
    logger.error(`Error fetching mobile dashboard: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch mobile dashboard' });
  }
});

// Get active calls for mobile monitoring
router.get('/active-calls', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    
    const activeCallsQuery = `
      SELECT 
        c.id,
        c.start_time,
        c.duration,
        c.status,
        c.category,
        c.sentiment,
        u.name as customer_name,
        u.phone as customer_phone
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.organization_id = ? 
      AND c.status IN ('in_progress', 'queued')
      ORDER BY c.start_time DESC
      LIMIT 20
    `;
    
    const activeCalls = await db.query(activeCallsQuery, [organizationId]);

    res.json({ success: true, data: activeCalls });
  } catch (error) {
    logger.error(`Error fetching active calls: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch active calls' });
  }
});

// Get call details for mobile view
router.get('/call/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const organizationId = req.user.organizationId || 1;
    
    const callQuery = `
      SELECT 
        c.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.id = ? AND c.organization_id = ?
    `;
    
    const callResult = await db.query(callQuery, [callId, organizationId]);
    
    if (!callResult || callResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    const call = callResult[0];

    // Get emotion analysis if available
    const emotionQuery = `
      SELECT analysis_type, emotion_data
      FROM emotion_analysis 
      WHERE call_id = ?
      ORDER BY created_at DESC
    `;
    
    const emotionResult = await db.query(emotionQuery, [callId]);
    const emotions = emotionResult.map(row => ({
      type: row.analysis_type,
      data: JSON.parse(row.emotion_data)
    }));

    const callDetails = {
      ...call,
      customer: {
        name: call.customer_name,
        email: call.customer_email,
        phone: call.customer_phone
      },
      emotions,
      timeline: generateCallTimeline(call)
    };

    res.json({ success: true, data: callDetails });
  } catch (error) {
    logger.error(`Error fetching call details: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch call details' });
  }
});

// Mobile-optimized analytics
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    const { period = '7d' } = req.query;

    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const summaryQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as calls,
        AVG(duration) as avg_duration,
        AVG(satisfaction_score) as avg_satisfaction,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalations
      FROM calls 
      WHERE organization_id = ? 
      AND start_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(start_time)
      ORDER BY date
    `;
    
    const summaryResult = await db.query(summaryQuery, [organizationId, days]);

    // Calculate trends
    const totalCalls = summaryResult.reduce((sum, day) => sum + day.calls, 0);
    const avgSatisfaction = summaryResult.reduce((sum, day) => sum + (day.avg_satisfaction || 0), 0) / summaryResult.length;
    const totalEscalations = summaryResult.reduce((sum, day) => sum + day.escalations, 0);
    const escalationRate = totalCalls > 0 ? (totalEscalations / totalCalls * 100).toFixed(1) : 0;

    const analytics = {
      period,
      summary: {
        totalCalls,
        avgSatisfaction: avgSatisfaction.toFixed(1),
        escalationRate,
        avgDuration: Math.round(summaryResult.reduce((sum, day) => sum + (day.avg_duration || 0), 0) / summaryResult.length)
      },
      dailyData: summaryResult.map(day => ({
        date: day.date,
        calls: day.calls,
        satisfaction: day.avg_satisfaction?.toFixed(1) || 'N/A',
        escalations: day.escalations
      })),
      trends: calculateMobileTrends(summaryResult)
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error(`Error fetching mobile analytics: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch mobile analytics' });
  }
});

// System status for mobile
router.get('/system-status', authenticateToken, async (req, res) => {
  try {
    const systemHealth = healthMonitoring.getHealthStatus();
    const qualityMetrics = callQualityMonitoring.getCurrentQualityMetrics();

    const status = {
      overall: systemHealth.overall?.status || 'unknown',
      services: {
        database: systemHealth.database?.status || 'unknown',
        ai: systemHealth.application?.aiServices || 'unknown',
        telephony: systemHealth.application?.telephonyService || 'unknown',
        quality: qualityMetrics.monitoringActive ? 'active' : 'inactive'
      },
      metrics: {
        uptime: systemHealth.system?.uptime || 0,
        memoryUsage: systemHealth.system?.memoryUsage || 0,
        cpuUsage: systemHealth.system?.cpuUsage || 0,
        activeConnections: systemHealth.database?.activeConnections || 0
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({ success: true, data: status });
  } catch (error) {
    logger.error(`Error fetching system status: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch system status' });
  }
});

// Mobile notifications/alerts
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    const { limit = 20 } = req.query;

    const notificationsQuery = `
      SELECT 
        id,
        type,
        title,
        message,
        severity,
        read_status,
        created_at
      FROM notifications 
      WHERE organization_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    
    const notifications = await db.query(notificationsQuery, [organizationId, parseInt(limit)]);

    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error(`Error fetching notifications: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const organizationId = req.user.organizationId || 1;

    await db.query(
      'UPDATE notifications SET read_status = TRUE WHERE id = ? AND organization_id = ?',
      [notificationId, organizationId]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// Quick actions for mobile
router.post('/quick-actions/:action', authenticateToken, async (req, res) => {
  try {
    const { action } = req.params;
    const { callId, data } = req.body;
    const organizationId = req.user.organizationId || 1;

    let result = {};

    switch (action) {
      case 'escalate-call':
        if (!callId) {
          return res.status(400).json({ success: false, error: 'Call ID required' });
        }
        
        await db.query(
          'UPDATE calls SET status = ?, escalated_reason = ?, escalated_at = ? WHERE id = ? AND organization_id = ?',
          ['escalated', data.reason || 'Manual escalation from mobile', new Date(), callId, organizationId]
        );
        
        result = { message: 'Call escalated successfully' };
        break;

      case 'add-note':
        if (!callId || !data.note) {
          return res.status(400).json({ success: false, error: 'Call ID and note required' });
        }
        
        await db.query(
          'INSERT INTO call_notes (call_id, note, created_by, created_at) VALUES (?, ?, ?, ?)',
          [callId, data.note, req.user.id, new Date()]
        );
        
        result = { message: 'Note added successfully' };
        break;

      case 'update-priority':
        if (!callId || !data.priority) {
          return res.status(400).json({ success: false, error: 'Call ID and priority required' });
        }
        
        await db.query(
          'UPDATE calls SET priority = ? WHERE id = ? AND organization_id = ?',
          [data.priority, callId, organizationId]
        );
        
        result = { message: 'Priority updated successfully' };
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`Error performing quick action: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to perform action' });
  }
});

// Helper functions
const generateCallTimeline = (call) => {
  const timeline = [];
  
  timeline.push({
    timestamp: call.start_time,
    event: 'Call Started',
    type: 'start',
    details: `Incoming call from ${call.customer_phone || 'Unknown'}`
  });

  if (call.ai_response_time) {
    timeline.push({
      timestamp: new Date(new Date(call.start_time).getTime() + (call.ai_response_time * 1000)),
      event: 'AI Response',
      type: 'ai',
      details: 'AI generated initial response'
    });
  }

  if (call.escalated_at) {
    timeline.push({
      timestamp: call.escalated_at,
      event: 'Escalated',
      type: 'escalation',
      details: call.escalated_reason || 'Call escalated to human agent'
    });
  }

  if (call.end_time) {
    timeline.push({
      timestamp: call.end_time,
      event: 'Call Ended',
      type: 'end',
      details: `Call completed with status: ${call.status}`
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const calculateMobileTrends = (data) => {
  if (data.length < 2) return { calls: 'stable', satisfaction: 'stable' };

  const recent = data.slice(-3);
  const previous = data.slice(-6, -3);

  const recentAvgCalls = recent.reduce((sum, day) => sum + day.calls, 0) / recent.length;
  const previousAvgCalls = previous.reduce((sum, day) => sum + day.calls, 0) / previous.length;

  const recentAvgSat = recent.reduce((sum, day) => sum + (day.avg_satisfaction || 0), 0) / recent.length;
  const previousAvgSat = previous.reduce((sum, day) => sum + (day.avg_satisfaction || 0), 0) / previous.length;

  return {
    calls: recentAvgCalls > previousAvgCalls * 1.1 ? 'increasing' : 
           recentAvgCalls < previousAvgCalls * 0.9 ? 'decreasing' : 'stable',
    satisfaction: recentAvgSat > previousAvgSat * 1.05 ? 'improving' :
                  recentAvgSat < previousAvgSat * 0.95 ? 'declining' : 'stable'
  };
};

module.exports = router;
