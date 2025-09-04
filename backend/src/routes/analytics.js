const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const db = require('../database/connection');

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    
    // Get overview statistics
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved_calls,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated_calls,
        COALESCE(AVG(duration), 0) as avg_call_duration
      FROM calls 
      WHERE organization_id = ? AND start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    
    const overviewResult = await db.query(overviewQuery, [organizationId]);
    const overview = overviewResult.rows[0];
    
    const resolutionRate = overview.total_calls > 0 
      ? (overview.resolved_calls / overview.total_calls * 100).toFixed(1)
      : 0;
    
    // Get call volume data
    const volumeQuery = `
      SELECT 
        SUM(CASE WHEN DATE(start_time) = CURDATE() THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN DATE(start_time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as yesterday,
        SUM(CASE WHEN start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) as this_week,
        SUM(CASE WHEN start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY) 
                 AND start_time < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) as last_week
      FROM calls 
      WHERE organization_id = ?
    `;
    
    const volumeResult = await db.query(volumeQuery, [organizationId]);
    const callVolume = volumeResult.rows[0];
    
    // Get hourly distribution
    const hourlyQuery = `
      SELECT 
        HOUR(start_time) as hour,
        COUNT(*) as calls
      FROM calls 
      WHERE organization_id = ? AND DATE(start_time) = CURDATE()
      GROUP BY HOUR(start_time)
      ORDER BY hour
    `;
    
    const hourlyResult = await db.query(hourlyQuery, [organizationId]);
    const hourlyDistribution = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourData = hourlyResult.rows.find(row => parseInt(row.hour) === hour);
      hourlyDistribution.push({
        hour,
        calls: hourData ? parseInt(hourData.calls) : 0
      });
    }
    
    // Get sentiment analysis
    const sentimentQuery = `
      SELECT 
        sentiment,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM call_interactions ci2 
                           WHERE ci2.call_id IN (
                             SELECT id FROM calls WHERE organization_id = ? 
                             AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                           ) AND ci2.sentiment IS NOT NULL) as percentage
      FROM call_interactions 
      WHERE call_id IN (
        SELECT id FROM calls WHERE organization_id = ? 
        AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      )
      AND sentiment IS NOT NULL
      GROUP BY sentiment
    `;
    
    const sentimentResult = await db.query(sentimentQuery, [organizationId, organizationId]);
    const sentimentAnalysis = { positive: 0, neutral: 0, negative: 0 };
    
    sentimentResult.rows.forEach(row => {
      sentimentAnalysis[row.sentiment] = parseFloat(row.percentage).toFixed(1);
    });

    const analytics = {
      overview: {
        totalCalls: parseInt(overview.total_calls),
        resolvedCalls: parseInt(overview.resolved_calls),
        escalatedCalls: parseInt(overview.escalated_calls),
        avgCallDuration: Math.round(parseFloat(overview.avg_call_duration)),
        resolutionRate: parseFloat(resolutionRate),
        customerSatisfaction: 4.2
      },
      callVolume: {
        today: parseInt(callVolume.today),
        yesterday: parseInt(callVolume.yesterday),
        thisWeek: parseInt(callVolume.this_week),
        lastWeek: parseInt(callVolume.last_week)
      },
      hourlyDistribution,
      sentimentAnalysis
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error(`Dashboard analytics error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics'
    });
  }
});

// Get call performance metrics
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, period = '7d' } = req.query;
    
    // Mock performance data
    const performance = {
      metrics: {
        totalCalls: 287,
        successfulCalls: 241,
        failedCalls: 46,
        avgDuration: 156,
        avgWaitTime: 2.3,
        resolutionRate: 84.0
      },
      trends: {
        callVolume: [
          { date: '2024-01-01', calls: 45 },
          { date: '2024-01-02', calls: 52 },
          { date: '2024-01-03', calls: 38 },
          { date: '2024-01-04', calls: 61 },
          { date: '2024-01-05', calls: 47 },
          { date: '2024-01-06', calls: 44 },
          { date: '2024-01-07', calls: 39 }
        ],
        resolutionRate: [
          { date: '2024-01-01', rate: 82.2 },
          { date: '2024-01-02', rate: 85.1 },
          { date: '2024-01-03', rate: 78.9 },
          { date: '2024-01-04', rate: 87.3 },
          { date: '2024-01-05', rate: 83.6 },
          { date: '2024-01-06', rate: 86.4 },
          { date: '2024-01-07', rate: 84.6 }
        ]
      },
      aiPerformance: {
        accuracy: 91.2,
        confidence: 87.5,
        responseTime: 1.8,
        escalationRate: 15.8
      }
    };

    res.json({ success: true, data: performance });
  } catch (error) {
    logger.error(`Error fetching performance metrics: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch performance metrics' });
  }
});

// Get sentiment analysis
router.get('/sentiment', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Mock sentiment data
    const sentiment = {
      overall: {
        positive: 68.3,
        neutral: 23.1,
        negative: 8.6,
        averageScore: 4.2
      },
      trends: [
        { date: '2024-01-01', positive: 65.2, neutral: 25.8, negative: 9.0 },
        { date: '2024-01-02', positive: 70.1, neutral: 22.3, negative: 7.6 },
        { date: '2024-01-03', positive: 68.9, neutral: 23.5, negative: 7.6 },
        { date: '2024-01-04', positive: 72.4, neutral: 20.1, negative: 7.5 },
        { date: '2024-01-05', positive: 66.8, neutral: 24.7, negative: 8.5 },
        { date: '2024-01-06', positive: 69.3, neutral: 22.9, negative: 7.8 },
        { date: '2024-01-07', positive: 71.2, neutral: 21.4, negative: 7.4 }
      ],
      byCategory: [
        { category: 'Billing', positive: 62.1, neutral: 28.3, negative: 9.6 },
        { category: 'Technical Support', positive: 58.7, neutral: 31.2, negative: 10.1 },
        { category: 'Account Management', positive: 75.4, neutral: 18.9, negative: 5.7 },
        { category: 'Product Information', positive: 82.3, neutral: 15.1, negative: 2.6 },
        { category: 'General Inquiry', positive: 79.8, neutral: 17.2, negative: 3.0 }
      ]
    };

    res.json({ success: true, data: sentiment });
  } catch (error) {
    logger.error(`Error fetching sentiment analysis: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch sentiment analysis' });
  }
});

// Get AI insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    // Mock AI insights
    const insights = {
      recommendations: [
        {
          id: 1,
          type: 'performance',
          priority: 'high',
          title: 'Improve Technical Support Resolution',
          description: 'Technical support calls have a 23% higher escalation rate. Consider adding more specific troubleshooting flows.',
          impact: 'Could reduce escalation rate by 8-12%',
          actionItems: [
            'Review common technical issues',
            'Enhance AI knowledge base',
            'Add step-by-step troubleshooting guides'
          ]
        },
        {
          id: 2,
          type: 'efficiency',
          priority: 'medium',
          title: 'Optimize Peak Hour Staffing',
          description: 'Call volume peaks between 10 AM - 3 PM. Consider adjusting AI response capacity.',
          impact: 'Could reduce average wait time by 15-20%',
          actionItems: [
            'Scale AI processing during peak hours',
            'Implement queue management',
            'Add proactive customer notifications'
          ]
        },
        {
          id: 3,
          type: 'satisfaction',
          priority: 'low',
          title: 'Enhance Billing Query Responses',
          description: 'Billing-related calls show lower satisfaction scores. Improve response accuracy.',
          impact: 'Could increase satisfaction by 0.3-0.5 points',
          actionItems: [
            'Update billing FAQ database',
            'Improve account integration',
            'Add payment status checking'
          ]
        }
      ],
      patterns: [
        {
          pattern: 'High call volume on Mondays',
          frequency: 'Weekly',
          impact: 'Medium',
          suggestion: 'Prepare additional capacity for Monday mornings'
        },
        {
          pattern: 'Billing queries spike after monthly statements',
          frequency: 'Monthly',
          impact: 'High',
          suggestion: 'Proactive communication about billing changes'
        },
        {
          pattern: 'Technical issues correlate with product updates',
          frequency: 'As needed',
          impact: 'Medium',
          suggestion: 'Coordinate AI training with product releases'
        }
      ],
      predictions: {
        nextWeekVolume: 312,
        expectedResolutionRate: 85.2,
        anticipatedEscalations: 47,
        recommendedActions: [
          'Prepare for 8% increase in call volume',
          'Focus on billing query optimization',
          'Monitor technical support performance'
        ]
      }
    };

    res.json({ success: true, data: insights });
  } catch (error) {
    logger.error(`Error fetching AI insights: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch AI insights' });
  }
});

// Export analytics data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    
    // Mock export data
    const exportData = {
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      summary: {
        totalCalls: 1247,
        resolutionRate: 84.8,
        avgDuration: 142,
        customerSatisfaction: 4.2
      },
      calls: [
        // Mock call data
        {
          id: 'call_001',
          date: '2024-01-07T10:30:00Z',
          duration: 156,
          resolved: true,
          sentiment: 'positive',
          category: 'billing'
        }
        // ... more call data
      ]
    };

    if (format === 'csv') {
      // Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=voxassist-analytics.csv');
      // TODO: Implement CSV conversion
      res.send('CSV data would be here');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=voxassist-analytics.json');
      res.json(exportData);
    }
  } catch (error) {
    logger.error(`Error exporting analytics: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to export analytics' });
  }
});

module.exports = router;
