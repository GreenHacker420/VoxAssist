const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const advancedAnalytics = require('../services/advancedAnalytics');
const callQualityMonitoring = require('../services/callQualityMonitoring');

// Get comprehensive performance report
router.get('/performance-report', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organizationId || 1;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const report = await advancedAnalytics.generatePerformanceReport(
      organizationId,
      startDate,
      endDate
    );

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Error generating performance report: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to generate performance report' });
  }
});

// Get real-time dashboard metrics
router.get('/real-time-dashboard', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    const dashboard = await advancedAnalytics.getRealTimeDashboard(organizationId);

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error(`Error fetching real-time dashboard: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch real-time dashboard' });
  }
});

// Get predictive analytics
router.get('/predictive', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    const predictions = await advancedAnalytics.generatePredictiveAnalytics(organizationId);

    res.json({ success: true, data: predictions });
  } catch (error) {
    logger.error(`Error generating predictive analytics: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to generate predictive analytics' });
  }
});

// Export analytics data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const organizationId = req.user.organizationId || 1;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const exportData = await advancedAnalytics.exportAnalyticsData(
      organizationId,
      startDate,
      endDate,
      format
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=voxassist-analytics.csv');
      res.send(exportData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=voxassist-analytics.json');
      res.json({ success: true, data: exportData });
    }
  } catch (error) {
    logger.error(`Error exporting analytics data: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to export analytics data' });
  }
});

// Get customer journey analytics
router.get('/customer-journey', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.query;
    const organizationId = req.user.organizationId || 1;

    const journeyAnalytics = await advancedAnalytics.getCustomerJourneyAnalytics(
      organizationId,
      customerId
    );

    res.json({ success: true, data: journeyAnalytics });
  } catch (error) {
    logger.error(`Error fetching customer journey analytics: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch customer journey analytics' });
  }
});

// Get call quality report
router.get('/quality-report', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organizationId || 1;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const qualityReport = await callQualityMonitoring.generateQualityReport(
      organizationId,
      startDate,
      endDate
    );

    res.json({ success: true, data: qualityReport });
  } catch (error) {
    logger.error(`Error generating quality report: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to generate quality report' });
  }
});

// Get current quality metrics
router.get('/quality-metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = callQualityMonitoring.getCurrentQualityMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error(`Error fetching quality metrics: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch quality metrics' });
  }
});

// Update quality thresholds
router.put('/quality-thresholds', authenticateToken, async (req, res) => {
  try {
    const { thresholds } = req.body;

    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid thresholds object is required'
      });
    }

    callQualityMonitoring.updateQualityThresholds(thresholds);

    res.json({ 
      success: true, 
      message: 'Quality thresholds updated successfully',
      data: { thresholds }
    });
  } catch (error) {
    logger.error(`Error updating quality thresholds: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update quality thresholds' });
  }
});

// Get business intelligence insights
router.get('/business-intelligence', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId || 1;
    const { timeframe = '30d' } = req.query;

    // Calculate date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get comprehensive analytics
    const [performanceReport, predictions, qualityReport] = await Promise.all([
      advancedAnalytics.generatePerformanceReport(
        organizationId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
      advancedAnalytics.generatePredictiveAnalytics(organizationId),
      callQualityMonitoring.generateQualityReport(
        organizationId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
    ]);

    const businessIntelligence = {
      timeframe,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      performance: performanceReport,
      predictions,
      quality: qualityReport,
      keyMetrics: {
        totalCalls: performanceReport.metrics.volume?.total_calls || 0,
        resolutionRate: performanceReport.metrics.resolutionRate || 0,
        avgSatisfaction: performanceReport.metrics.volume?.avg_satisfaction || 0,
        qualityScore: qualityReport.conversationQuality?.avg_conversation_quality || 0
      },
      trends: {
        callVolumeGrowth: calculateGrowthRate(performanceReport.trends.daily, 'calls'),
        satisfactionTrend: calculateTrend(performanceReport.trends.daily, 'satisfaction'),
        qualityTrend: 'stable' // Simplified for now
      }
    };

    res.json({ success: true, data: businessIntelligence });
  } catch (error) {
    logger.error(`Error generating business intelligence: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to generate business intelligence' });
  }
});

// Helper function to calculate growth rate
const calculateGrowthRate = (dailyData, metric) => {
  if (!dailyData || dailyData.length < 2) return 0;
  
  const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
  const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, day) => sum + (day[metric] || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, day) => sum + (day[metric] || 0), 0) / secondHalf.length;
  
  return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100).toFixed(1) : 0;
};

// Helper function to calculate trend
const calculateTrend = (dailyData, metric) => {
  if (!dailyData || dailyData.length < 3) return 'stable';
  
  const recent = dailyData.slice(-3);
  const values = recent.map(day => day[metric] || 0);
  
  const isIncreasing = values[2] > values[1] && values[1] > values[0];
  const isDecreasing = values[2] < values[1] && values[1] < values[0];
  
  if (isIncreasing) return 'increasing';
  if (isDecreasing) return 'decreasing';
  return 'stable';
};

module.exports = router;
