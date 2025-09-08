const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Helper function to convert data to CSV format
function convertToCSV(data) {
  if (!data || !data.calls || data.calls.length === 0) {
    return 'No data available';
  }
  
  const headers = ['Date', 'Customer Phone', 'Duration', 'Status', 'Sentiment', 'Category'];
  const csvRows = [headers.join(',')];
  
  data.calls.forEach(call => {
    const row = [
      call.date || '',
      call.customerPhone || '',
      call.duration || 0,
      call.status || '',
      call.sentiment || '',
      call.category || ''
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}


// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    
    // Get overview statistics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const calls = await prisma.call.findMany({
      where: {
        organizationId: organizationId,
        startTime: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        status: true,
        duration: true
      }
    });
    
    const totalCalls = calls.length;
    const resolvedCalls = calls.filter(call => call.status === 'completed').length;
    const escalatedCalls = calls.filter(call => call.status === 'escalated').length;
    const avgCallDuration = calls.length > 0 
      ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length 
      : 0;
    
    const overview = {
      total_calls: totalCalls,
      resolved_calls: resolvedCalls,
      escalated_calls: escalatedCalls,
      avg_call_duration: avgCallDuration
    };
    
    const resolutionRate = overview.total_calls > 0 
      ? (overview.resolved_calls / overview.total_calls * 100).toFixed(1)
      : 0;
    
    // Get call volume data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [todayCalls, yesterdayCalls, thisWeekCalls, lastWeekCalls] = await Promise.all([
      prisma.call.count({
        where: {
          organizationId: organizationId,
          startTime: { gte: today }
        }
      }),
      prisma.call.count({
        where: {
          organizationId: organizationId,
          startTime: { gte: yesterday, lt: today }
        }
      }),
      prisma.call.count({
        where: {
          organizationId: organizationId,
          startTime: { gte: thisWeekStart }
        }
      }),
      prisma.call.count({
        where: {
          organizationId: organizationId,
          startTime: { gte: lastWeekStart, lt: thisWeekStart }
        }
      })
    ]);
    
    const callVolume = {
      today: todayCalls,
      yesterday: yesterdayCalls,
      this_week: thisWeekCalls,
      last_week: lastWeekCalls
    };
    
    // Get hourly distribution
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todaysCalls = await prisma.call.findMany({
      where: {
        organizationId: organizationId,
        startTime: {
          gte: todayStart,
          lt: todayEnd
        }
      },
      select: {
        startTime: true
      }
    });
    
    const hourlyDistribution = [];
    for (let hour = 0; hour < 24; hour++) {
      const callsInHour = todaysCalls.filter(call => 
        call.startTime.getHours() === hour
      ).length;
      hourlyDistribution.push({
        hour,
        calls: callsInHour
      });
    }
    
    // Get sentiment analysis
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentCalls = await prisma.call.findMany({
      where: {
        organizationId: organizationId,
        startTime: { gte: sevenDaysAgo }
      },
      select: { id: true }
    });
    
    const callIds = recentCalls.map(call => call.id);
    
    const interactions = await prisma.callInteraction.findMany({
      where: {
        callId: { in: callIds },
        sentiment: { not: null }
      },
      select: { sentiment: true }
    });
    
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    interactions.forEach(interaction => {
      if (sentimentCounts.hasOwnProperty(interaction.sentiment)) {
        sentimentCounts[interaction.sentiment]++;
      }
    });
    
    const totalInteractions = interactions.length;
    const sentimentAnalysis = {
      positive: totalInteractions > 0 ? ((sentimentCounts.positive / totalInteractions) * 100).toFixed(1) : '0',
      neutral: totalInteractions > 0 ? ((sentimentCounts.neutral / totalInteractions) * 100).toFixed(1) : '0',
      negative: totalInteractions > 0 ? ((sentimentCounts.negative / totalInteractions) * 100).toFixed(1) : '0'
    };

    const analytics = {
      overview: {
        totalCalls: overview.total_calls,
        resolvedCalls: overview.resolved_calls,
        escalatedCalls: overview.escalated_calls,
        avgCallDuration: Math.round(overview.avg_call_duration),
        resolutionRate: parseFloat(resolutionRate),
        customerSatisfaction: 4.2
      },
      callVolume: {
        today: callVolume.today,
        yesterday: callVolume.yesterday,
        thisWeek: callVolume.this_week,
        lastWeek: callVolume.last_week
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
      
      // Implement CSV conversion
      const csvData = convertToCSV(data);
      res.send(csvData);
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
