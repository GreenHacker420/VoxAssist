const logger = require('../utils/logger');
const db = require('../database/connection');

/**
 * Advanced Analytics Service - Functional Version
 * Provides comprehensive analytics, reporting, and business intelligence
 */

/**
 * Generate comprehensive performance report
 */
const generatePerformanceReport = async (organizationId, startDate, endDate) => {
  try {
    const report = {
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      metrics: {},
      trends: {},
      insights: []
    };

    // Call volume metrics
    const volumeQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_calls,
        COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_calls,
        AVG(duration) as avg_duration,
        AVG(wait_time) as avg_wait_time,
        AVG(satisfaction_score) as avg_satisfaction
      FROM calls 
      WHERE organization_id = ? AND start_time BETWEEN ? AND ?
    `;
    
    const volumeResult = await db.query(volumeQuery, [organizationId, startDate, endDate]);
    report.metrics.volume = volumeResult[0];

    // Resolution rate calculation
    report.metrics.resolutionRate = report.metrics.volume.total_calls > 0 
      ? (report.metrics.volume.completed_calls / report.metrics.volume.total_calls * 100).toFixed(2)
      : 0;

    // Category performance
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as call_count,
        AVG(duration) as avg_duration,
        AVG(satisfaction_score) as avg_satisfaction,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalations
      FROM calls 
      WHERE organization_id = ? AND start_time BETWEEN ? AND ?
      GROUP BY category
      ORDER BY call_count DESC
    `;
    
    const categoryResult = await db.query(categoryQuery, [organizationId, startDate, endDate]);
    report.metrics.categoryPerformance = categoryResult;

    // Time-based trends
    const trendsQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as calls,
        AVG(duration) as avg_duration,
        AVG(satisfaction_score) as satisfaction
      FROM calls 
      WHERE organization_id = ? AND start_time BETWEEN ? AND ?
      GROUP BY DATE(start_time)
      ORDER BY date
    `;
    
    const trendsResult = await db.query(trendsQuery, [organizationId, startDate, endDate]);
    report.trends.daily = trendsResult;

    // Generate insights
    report.insights = await generateInsights(report.metrics, report.trends);

    return report;
  } catch (error) {
    logger.error('Error generating performance report:', error);
    throw error;
  }
};

/**
 * Generate AI-powered insights from analytics data
 */
const generateInsights = async (metrics, trends) => {
  const insights = [];

  // Resolution rate insight
  if (metrics.resolutionRate < 80) {
    insights.push({
      type: 'performance',
      priority: 'high',
      title: 'Low Resolution Rate Detected',
      description: `Current resolution rate is ${metrics.resolutionRate}%, below the 80% target.`,
      recommendation: 'Review escalation patterns and enhance AI training data.',
      impact: 'high'
    });
  }

  // Average duration insight
  if (metrics.volume.avg_duration > 180) {
    insights.push({
      type: 'efficiency',
      priority: 'medium',
      title: 'Long Call Duration',
      description: `Average call duration is ${Math.round(metrics.volume.avg_duration)} seconds.`,
      recommendation: 'Optimize response generation and reduce conversation loops.',
      impact: 'medium'
    });
  }

  // Satisfaction insight
  if (metrics.volume.avg_satisfaction < 4.0) {
    insights.push({
      type: 'satisfaction',
      priority: 'high',
      title: 'Customer Satisfaction Below Target',
      description: `Average satisfaction score is ${metrics.volume.avg_satisfaction?.toFixed(1)}/5.0.`,
      recommendation: 'Analyze negative feedback and improve response quality.',
      impact: 'high'
    });
  }

  return insights;
};

/**
 * Generate real-time dashboard metrics
 */
const getRealTimeDashboard = async (organizationId) => {
  try {
    const dashboard = {
      timestamp: new Date().toISOString(),
      live: {},
      today: {},
      trends: {}
    };

    // Live metrics (last 5 minutes)
    const liveQuery = `
      SELECT 
        COUNT(*) as active_calls,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as ongoing_calls,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued_calls
      FROM calls 
      WHERE organization_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `;
    
    const liveResult = await db.query(liveQuery, [organizationId]);
    dashboard.live = liveResult[0];

    // Today's metrics
    const todayQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        AVG(duration) as avg_duration,
        AVG(satisfaction_score) as avg_satisfaction
      FROM calls 
      WHERE organization_id = ? AND DATE(start_time) = CURDATE()
    `;
    
    const todayResult = await db.query(todayQuery, [organizationId]);
    dashboard.today = todayResult[0];

    // Hourly trends for today
    const hourlyQuery = `
      SELECT 
        HOUR(start_time) as hour,
        COUNT(*) as calls,
        AVG(duration) as avg_duration
      FROM calls 
      WHERE organization_id = ? AND DATE(start_time) = CURDATE()
      GROUP BY HOUR(start_time)
      ORDER BY hour
    `;
    
    const hourlyResult = await db.query(hourlyQuery, [organizationId]);
    dashboard.trends.hourly = hourlyResult;

    return dashboard;
  } catch (error) {
    logger.error('Error generating real-time dashboard:', error);
    throw error;
  }
};

/**
 * Generate predictive analytics
 */
const generatePredictiveAnalytics = async (organizationId) => {
  try {
    // Get historical data for predictions
    const historicalQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as calls,
        AVG(duration) as avg_duration,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalations
      FROM calls 
      WHERE organization_id = ? AND start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(start_time)
      ORDER BY date
    `;
    
    const historicalData = await db.query(historicalQuery, [organizationId]);

    // Simple trend analysis (in production, use ML models)
    const predictions = {
      nextWeek: {},
      nextMonth: {},
      recommendations: []
    };

    if (historicalData.length > 0) {
      const avgCalls = historicalData.reduce((sum, day) => sum + day.calls, 0) / historicalData.length;
      const avgEscalations = historicalData.reduce((sum, day) => sum + day.escalations, 0) / historicalData.length;

      predictions.nextWeek = {
        expectedCalls: Math.round(avgCalls * 7),
        expectedEscalations: Math.round(avgEscalations * 7),
        confidence: 0.75
      };

      predictions.nextMonth = {
        expectedCalls: Math.round(avgCalls * 30),
        expectedEscalations: Math.round(avgEscalations * 30),
        confidence: 0.65
      };

      // Generate recommendations based on trends
      if (avgEscalations / avgCalls > 0.15) {
        predictions.recommendations.push({
          type: 'escalation_reduction',
          priority: 'high',
          message: 'High escalation rate detected. Consider AI training improvements.'
        });
      }
    }

    return predictions;
  } catch (error) {
    logger.error('Error generating predictive analytics:', error);
    throw error;
  }
};

/**
 * Export analytics data in various formats
 */
const exportAnalyticsData = async (organizationId, startDate, endDate, format = 'json') => {
  try {
    const exportQuery = `
      SELECT 
        c.id,
        c.start_time,
        c.end_time,
        c.duration,
        c.status,
        c.category,
        c.satisfaction_score,
        c.sentiment,
        c.escalated_reason,
        u.name as customer_name
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.organization_id = ? AND c.start_time BETWEEN ? AND ?
      ORDER BY c.start_time DESC
    `;
    
    const data = await db.query(exportQuery, [organizationId, startDate, endDate]);

    if (format === 'csv') {
      return convertToCSV(data);
    } else if (format === 'excel') {
      return convertToExcel(data);
    } else {
      return {
        metadata: {
          exportedAt: new Date().toISOString(),
          period: { startDate, endDate },
          recordCount: data.length
        },
        data
      };
    }
  } catch (error) {
    logger.error('Error exporting analytics data:', error);
    throw error;
  }
};

/**
 * Convert data to CSV format
 */
const convertToCSV = (data) => {
  if (!data.length) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(',')
  );

  return [headers, ...rows].join('\n');
};

/**
 * Generate customer journey analytics
 */
const getCustomerJourneyAnalytics = async (organizationId, customerId = null) => {
  try {
    let query = `
      SELECT 
        c.id,
        c.start_time,
        c.category,
        c.status,
        c.duration,
        c.satisfaction_score,
        c.sentiment,
        u.name as customer_name,
        u.email as customer_email
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.organization_id = ?
    `;
    
    const params = [organizationId];
    
    if (customerId) {
      query += ' AND c.customer_id = ?';
      params.push(customerId);
    }
    
    query += ' ORDER BY c.start_time DESC LIMIT 1000';
    
    const journeyData = await db.query(query, params);

    // Analyze journey patterns
    const patterns = analyzeJourneyPatterns(journeyData);

    return {
      journeyData,
      patterns,
      insights: generateJourneyInsights(patterns)
    };
  } catch (error) {
    logger.error('Error generating customer journey analytics:', error);
    throw error;
  }
};

/**
 * Analyze customer journey patterns
 */
const analyzeJourneyPatterns = (journeyData) => {
  const patterns = {
    repeatCustomers: 0,
    avgCallsPerCustomer: 0,
    commonSequences: [],
    satisfactionTrends: {}
  };

  // Group by customer
  const customerGroups = {};
  journeyData.forEach(call => {
    if (!customerGroups[call.customer_email]) {
      customerGroups[call.customer_email] = [];
    }
    customerGroups[call.customer_email].push(call);
  });

  // Calculate patterns
  patterns.repeatCustomers = Object.keys(customerGroups).filter(
    email => customerGroups[email].length > 1
  ).length;

  const totalCalls = journeyData.length;
  const uniqueCustomers = Object.keys(customerGroups).length;
  patterns.avgCallsPerCustomer = uniqueCustomers > 0 ? (totalCalls / uniqueCustomers).toFixed(2) : 0;

  return patterns;
};

/**
 * Generate insights from journey patterns
 */
const generateJourneyInsights = (patterns) => {
  const insights = [];

  if (patterns.avgCallsPerCustomer > 2) {
    insights.push({
      type: 'customer_experience',
      priority: 'medium',
      title: 'High Repeat Call Rate',
      description: `Customers average ${patterns.avgCallsPerCustomer} calls, indicating potential resolution issues.`,
      recommendation: 'Improve first-call resolution and follow-up processes.'
    });
  }

  return insights;
};

module.exports = {
  generatePerformanceReport,
  getRealTimeDashboard,
  generatePredictiveAnalytics,
  exportAnalyticsData,
  getCustomerJourneyAnalytics,
  generateInsights
};
