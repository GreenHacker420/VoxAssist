const logger = require('../utils/logger');
const db = require('../database/connection');
const geminiService = require('./geminiService');

/**
 * Predictive Analytics and Forecasting Service - Functional Version
 * Provides ML-powered predictions and forecasting capabilities
 */

// Module state
let models = {
  callVolume: null,
  escalationRate: null,
  customerSatisfaction: null,
  seasonalTrends: null
};

let predictions = {
  callVolume: [],
  escalationRate: [],
  satisfaction: [],
  trends: []
};

/**
 * Initialize predictive analytics models
 */
const initializePredictiveModels = async () => {
  try {
    logger.info('Initializing predictive analytics models');
    
    // In production, load pre-trained ML models
    // For now, we'll use statistical analysis and AI-powered insights
    
    models.callVolume = { initialized: true, type: 'time_series' };
    models.escalationRate = { initialized: true, type: 'classification' };
    models.customerSatisfaction = { initialized: true, type: 'regression' };
    models.seasonalTrends = { initialized: true, type: 'seasonal_decomposition' };
    
    logger.info('Predictive analytics models initialized');
  } catch (error) {
    logger.error('Error initializing predictive models:', error);
    throw error;
  }
};

/**
 * Generate call volume predictions
 */
const predictCallVolume = async (organizationId, forecastDays = 30) => {
  try {
    // Get historical call volume data
    const historicalQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as call_count,
        HOUR(start_time) as hour,
        DAYOFWEEK(start_time) as day_of_week,
        WEEK(start_time) as week_number
      FROM calls 
      WHERE organization_id = ? 
      AND start_time >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY DATE(start_time), HOUR(start_time)
      ORDER BY date, hour
    `;
    
    const historicalData = await db.query(historicalQuery, [organizationId]);
    
    if (historicalData.length === 0) {
      return { predictions: [], confidence: 0, message: 'Insufficient historical data' };
    }

    // Calculate daily averages and trends
    const dailyData = groupByDate(historicalData);
    const weeklyPattern = calculateWeeklyPattern(dailyData);
    const hourlyPattern = calculateHourlyPattern(historicalData);
    const trend = calculateTrend(dailyData);

    // Generate predictions for the next N days
    const predictions = [];
    const today = new Date();
    
    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      
      const dayOfWeek = futureDate.getDay();
      const weekMultiplier = weeklyPattern[dayOfWeek] || 1;
      const trendMultiplier = 1 + (trend * i / 100);
      
      // Base prediction on historical average
      const basePrediction = calculateDailyAverage(dailyData);
      const prediction = Math.round(basePrediction * weekMultiplier * trendMultiplier);
      
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predictedCalls: Math.max(0, prediction),
        confidence: calculateConfidence(i, historicalData.length),
        factors: {
          dayOfWeek: dayOfWeek,
          weeklyMultiplier: weekMultiplier.toFixed(2),
          trendMultiplier: trendMultiplier.toFixed(2)
        }
      });
    }

    // Store predictions
    predictions.callVolume = predictions;

    return {
      predictions,
      confidence: calculateOverallConfidence(predictions),
      metadata: {
        historicalDays: Math.ceil(historicalData.length / 24),
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        weeklyPattern,
        hourlyPattern
      }
    };

  } catch (error) {
    logger.error('Error predicting call volume:', error);
    throw error;
  }
};

/**
 * Predict escalation probability
 */
const predictEscalationProbability = async (organizationId, callContext) => {
  try {
    // Get historical escalation data
    const escalationQuery = `
      SELECT 
        category,
        sentiment,
        customer_satisfaction,
        duration,
        status,
        escalated_reason,
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated_calls
      FROM calls 
      WHERE organization_id = ? 
      AND start_time >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
      GROUP BY category, sentiment
      HAVING total_calls >= 5
    `;
    
    const escalationData = await db.query(escalationQuery, [organizationId]);

    if (escalationData.length === 0) {
      return { probability: 0.1, confidence: 0.3, factors: [] };
    }

    // Find matching patterns
    const matchingPatterns = escalationData.filter(row => 
      row.category === callContext.category && 
      row.sentiment === callContext.sentiment
    );

    let baseProbability = 0.1; // Default 10%
    let confidence = 0.5;
    const factors = [];

    if (matchingPatterns.length > 0) {
      const pattern = matchingPatterns[0];
      baseProbability = pattern.escalated_calls / pattern.total_calls;
      confidence = Math.min(0.9, pattern.total_calls / 50); // Higher confidence with more data
      
      factors.push({
        factor: 'Historical Pattern',
        impact: baseProbability,
        description: `${pattern.escalated_calls}/${pattern.total_calls} similar calls escalated`
      });
    }

    // Adjust based on call context
    let adjustedProbability = baseProbability;

    // Duration factor
    if (callContext.duration > 300) { // > 5 minutes
      adjustedProbability *= 1.3;
      factors.push({
        factor: 'Call Duration',
        impact: 0.3,
        description: 'Long call duration increases escalation risk'
      });
    }

    // Sentiment factor
    if (callContext.sentiment === 'negative') {
      adjustedProbability *= 1.5;
      factors.push({
        factor: 'Negative Sentiment',
        impact: 0.5,
        description: 'Negative sentiment increases escalation risk'
      });
    }

    // Customer history factor
    if (callContext.customerHistory?.previousEscalations > 0) {
      adjustedProbability *= 1.4;
      factors.push({
        factor: 'Customer History',
        impact: 0.4,
        description: 'Customer has previous escalations'
      });
    }

    // Cap probability at 95%
    adjustedProbability = Math.min(0.95, adjustedProbability);

    return {
      probability: adjustedProbability,
      confidence,
      factors,
      recommendation: adjustedProbability > 0.6 ? 'Consider human handoff' : 'Continue with AI'
    };

  } catch (error) {
    logger.error('Error predicting escalation probability:', error);
    throw error;
  }
};

/**
 * Predict customer satisfaction
 */
const predictCustomerSatisfaction = async (organizationId, callContext) => {
  try {
    // Get historical satisfaction data
    const satisfactionQuery = `
      SELECT 
        category,
        sentiment,
        duration,
        status,
        AVG(satisfaction_score) as avg_satisfaction,
        COUNT(*) as call_count,
        STDDEV(satisfaction_score) as satisfaction_stddev
      FROM calls 
      WHERE organization_id = ? 
      AND satisfaction_score IS NOT NULL
      AND start_time >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
      GROUP BY category, sentiment, status
      HAVING call_count >= 3
    `;
    
    const satisfactionData = await db.query(satisfactionQuery, [organizationId]);

    if (satisfactionData.length === 0) {
      return { predictedScore: 4.0, confidence: 0.3, factors: [] };
    }

    // Find best matching pattern
    const matchingPattern = findBestMatch(satisfactionData, callContext);
    
    let predictedScore = matchingPattern ? matchingPattern.avg_satisfaction : 4.0;
    let confidence = matchingPattern ? Math.min(0.9, matchingPattern.call_count / 20) : 0.3;
    const factors = [];

    if (matchingPattern) {
      factors.push({
        factor: 'Historical Pattern',
        impact: predictedScore,
        description: `Based on ${matchingPattern.call_count} similar calls`
      });
    }

    // Adjust based on call context
    if (callContext.sentiment === 'positive') {
      predictedScore += 0.3;
      factors.push({
        factor: 'Positive Sentiment',
        impact: 0.3,
        description: 'Positive sentiment improves satisfaction'
      });
    } else if (callContext.sentiment === 'negative') {
      predictedScore -= 0.5;
      factors.push({
        factor: 'Negative Sentiment',
        impact: -0.5,
        description: 'Negative sentiment reduces satisfaction'
      });
    }

    // Resolution speed factor
    if (callContext.expectedDuration && callContext.expectedDuration < 120) {
      predictedScore += 0.2;
      factors.push({
        factor: 'Quick Resolution',
        impact: 0.2,
        description: 'Fast resolution improves satisfaction'
      });
    }

    // Cap score between 1 and 5
    predictedScore = Math.max(1, Math.min(5, predictedScore));

    return {
      predictedScore: Math.round(predictedScore * 10) / 10,
      confidence,
      factors,
      category: predictedScore >= 4.5 ? 'Excellent' : 
                predictedScore >= 4.0 ? 'Good' : 
                predictedScore >= 3.0 ? 'Average' : 'Poor'
    };

  } catch (error) {
    logger.error('Error predicting customer satisfaction:', error);
    throw error;
  }
};

/**
 * Generate seasonal trend analysis
 */
const analyzeSeasonalTrends = async (organizationId) => {
  try {
    // Get historical data for seasonal analysis
    const seasonalQuery = `
      SELECT 
        YEAR(start_time) as year,
        MONTH(start_time) as month,
        WEEK(start_time) as week,
        DAYOFWEEK(start_time) as day_of_week,
        HOUR(start_time) as hour,
        COUNT(*) as call_count,
        AVG(duration) as avg_duration,
        AVG(satisfaction_score) as avg_satisfaction
      FROM calls 
      WHERE organization_id = ? 
      AND start_time >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY YEAR(start_time), MONTH(start_time), WEEK(start_time), DAYOFWEEK(start_time), HOUR(start_time)
      ORDER BY year, month, week, day_of_week, hour
    `;
    
    const seasonalData = await db.query(seasonalQuery, [organizationId]);

    if (seasonalData.length === 0) {
      return { trends: [], insights: [], confidence: 0 };
    }

    // Analyze monthly trends
    const monthlyTrends = analyzeMonthlyTrends(seasonalData);
    const weeklyTrends = analyzeWeeklyTrends(seasonalData);
    const hourlyTrends = analyzeHourlyTrends(seasonalData);

    // Generate insights
    const insights = generateSeasonalInsights(monthlyTrends, weeklyTrends, hourlyTrends);

    return {
      trends: {
        monthly: monthlyTrends,
        weekly: weeklyTrends,
        hourly: hourlyTrends
      },
      insights,
      confidence: calculateSeasonalConfidence(seasonalData.length)
    };

  } catch (error) {
    logger.error('Error analyzing seasonal trends:', error);
    throw error;
  }
};

/**
 * Generate AI-powered business forecasts
 */
const generateBusinessForecasts = async (organizationId, timeframe = '3months') => {
  try {
    // Get comprehensive historical data
    const forecastQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as calls,
        AVG(duration) as avg_duration,
        AVG(satisfaction_score) as avg_satisfaction,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalations,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolutions
      FROM calls 
      WHERE organization_id = ? 
      AND start_time >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE(start_time)
      ORDER BY date
    `;
    
    const historicalData = await db.query(forecastQuery, [organizationId]);

    if (historicalData.length < 30) {
      return { forecasts: [], confidence: 0.2, message: 'Insufficient data for reliable forecasting' };
    }

    // Use AI to generate insights and forecasts
    const aiPrompt = `
      Analyze this call center data and provide business forecasts:
      
      Historical Data Summary:
      - Total days of data: ${historicalData.length}
      - Average daily calls: ${(historicalData.reduce((sum, day) => sum + day.calls, 0) / historicalData.length).toFixed(1)}
      - Average resolution rate: ${(historicalData.reduce((sum, day) => sum + (day.resolutions / day.calls), 0) / historicalData.length * 100).toFixed(1)}%
      - Average satisfaction: ${(historicalData.reduce((sum, day) => sum + (day.avg_satisfaction || 0), 0) / historicalData.length).toFixed(1)}
      
      Recent trends (last 30 days vs previous 30 days):
      ${calculateRecentTrends(historicalData)}
      
      Provide forecasts for the next ${timeframe} including:
      1. Call volume predictions
      2. Resource requirements
      3. Expected challenges
      4. Optimization opportunities
      5. Business impact projections
      
      Format as JSON with specific metrics and confidence levels.
    `;

    const aiResponse = await geminiService.processCustomerQuery(aiPrompt);
    
    // Parse AI response and combine with statistical analysis
    let aiForecasts = {};
    try {
      aiForecasts = JSON.parse(aiResponse.response);
    } catch (parseError) {
      logger.warn('Could not parse AI forecast response, using statistical analysis only');
    }

    // Generate statistical forecasts
    const statisticalForecasts = generateStatisticalForecasts(historicalData, timeframe);

    return {
      forecasts: {
        statistical: statisticalForecasts,
        aiInsights: aiForecasts,
        combined: combineForecasts(statisticalForecasts, aiForecasts)
      },
      confidence: calculateForecastConfidence(historicalData.length, timeframe),
      metadata: {
        dataPoints: historicalData.length,
        timeframe,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('Error generating business forecasts:', error);
    throw error;
  }
};

// Helper functions

const groupByDate = (data) => {
  const grouped = {};
  data.forEach(row => {
    if (!grouped[row.date]) {
      grouped[row.date] = [];
    }
    grouped[row.date].push(row);
  });
  return grouped;
};

const calculateWeeklyPattern = (dailyData) => {
  const pattern = {};
  const dates = Object.keys(dailyData);
  
  dates.forEach(date => {
    const dayOfWeek = new Date(date).getDay();
    const callCount = dailyData[date].reduce((sum, hour) => sum + hour.call_count, 0);
    
    if (!pattern[dayOfWeek]) {
      pattern[dayOfWeek] = [];
    }
    pattern[dayOfWeek].push(callCount);
  });

  // Calculate averages
  Object.keys(pattern).forEach(day => {
    const avg = pattern[day].reduce((sum, count) => sum + count, 0) / pattern[day].length;
    pattern[day] = avg;
  });

  return pattern;
};

const calculateHourlyPattern = (data) => {
  const pattern = {};
  
  data.forEach(row => {
    if (!pattern[row.hour]) {
      pattern[row.hour] = [];
    }
    pattern[row.hour].push(row.call_count);
  });

  Object.keys(pattern).forEach(hour => {
    const avg = pattern[hour].reduce((sum, count) => sum + count, 0) / pattern[hour].length;
    pattern[hour] = avg;
  });

  return pattern;
};

const calculateTrend = (dailyData) => {
  const dates = Object.keys(dailyData).sort();
  if (dates.length < 7) return 0;

  const recentWeek = dates.slice(-7);
  const previousWeek = dates.slice(-14, -7);

  const recentAvg = recentWeek.reduce((sum, date) => {
    return sum + dailyData[date].reduce((daySum, hour) => daySum + hour.call_count, 0);
  }, 0) / recentWeek.length;

  const previousAvg = previousWeek.reduce((sum, date) => {
    return sum + dailyData[date].reduce((daySum, hour) => daySum + hour.call_count, 0);
  }, 0) / previousWeek.length;

  return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
};

const calculateDailyAverage = (dailyData) => {
  const dates = Object.keys(dailyData);
  const totalCalls = dates.reduce((sum, date) => {
    return sum + dailyData[date].reduce((daySum, hour) => daySum + hour.call_count, 0);
  }, 0);
  
  return totalCalls / dates.length;
};

const calculateConfidence = (daysAhead, historicalDataPoints) => {
  const baseConfidence = Math.min(0.9, historicalDataPoints / 100);
  const timeDecay = Math.max(0.1, 1 - (daysAhead / 30));
  return baseConfidence * timeDecay;
};

const calculateOverallConfidence = (predictions) => {
  return predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length;
};

const findBestMatch = (data, context) => {
  // Simple matching algorithm - in production, use more sophisticated ML matching
  return data.find(row => 
    row.category === context.category && 
    row.sentiment === context.sentiment
  ) || data[0];
};

const analyzeMonthlyTrends = (data) => {
  const monthly = {};
  data.forEach(row => {
    const key = `${row.year}-${row.month}`;
    if (!monthly[key]) {
      monthly[key] = { calls: 0, duration: 0, satisfaction: 0, count: 0 };
    }
    monthly[key].calls += row.call_count;
    monthly[key].duration += row.avg_duration || 0;
    monthly[key].satisfaction += row.avg_satisfaction || 0;
    monthly[key].count++;
  });

  return Object.keys(monthly).map(key => ({
    period: key,
    calls: monthly[key].calls,
    avgDuration: monthly[key].duration / monthly[key].count,
    avgSatisfaction: monthly[key].satisfaction / monthly[key].count
  }));
};

const analyzeWeeklyTrends = (data) => {
  const weekly = {};
  data.forEach(row => {
    if (!weekly[row.day_of_week]) {
      weekly[row.day_of_week] = { calls: 0, count: 0 };
    }
    weekly[row.day_of_week].calls += row.call_count;
    weekly[row.day_of_week].count++;
  });

  return Object.keys(weekly).map(day => ({
    dayOfWeek: parseInt(day),
    avgCalls: weekly[day].calls / weekly[day].count
  }));
};

const analyzeHourlyTrends = (data) => {
  const hourly = {};
  data.forEach(row => {
    if (!hourly[row.hour]) {
      hourly[row.hour] = { calls: 0, count: 0 };
    }
    hourly[row.hour].calls += row.call_count;
    hourly[row.hour].count++;
  });

  return Object.keys(hourly).map(hour => ({
    hour: parseInt(hour),
    avgCalls: hourly[hour].calls / hourly[hour].count
  }));
};

const generateSeasonalInsights = (monthly, weekly, hourly) => {
  const insights = [];

  // Peak hours
  const peakHour = hourly.reduce((max, curr) => curr.avgCalls > max.avgCalls ? curr : max);
  insights.push({
    type: 'peak_hours',
    insight: `Peak call volume occurs at ${peakHour.hour}:00 with ${peakHour.avgCalls.toFixed(1)} average calls`
  });

  // Peak days
  const peakDay = weekly.reduce((max, curr) => curr.avgCalls > max.avgCalls ? curr : max);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  insights.push({
    type: 'peak_days',
    insight: `${dayNames[peakDay.dayOfWeek]} is the busiest day with ${peakDay.avgCalls.toFixed(1)} average calls`
  });

  return insights;
};

const calculateSeasonalConfidence = (dataPoints) => {
  return Math.min(0.9, dataPoints / 1000);
};

const calculateRecentTrends = (data) => {
  if (data.length < 60) return 'Insufficient data for trend analysis';

  const recent30 = data.slice(-30);
  const previous30 = data.slice(-60, -30);

  const recentAvg = recent30.reduce((sum, day) => sum + day.calls, 0) / 30;
  const previousAvg = previous30.reduce((sum, day) => sum + day.calls, 0) / 30;

  const change = ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1);
  return `Call volume ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}%`;
};

const generateStatisticalForecasts = (data, timeframe) => {
  const days = timeframe === '1month' ? 30 : timeframe === '3months' ? 90 : 180;
  const avgCalls = data.reduce((sum, day) => sum + day.calls, 0) / data.length;
  
  return {
    callVolume: {
      daily: avgCalls,
      total: avgCalls * days,
      confidence: 0.7
    },
    resourceNeeds: {
      agents: Math.ceil(avgCalls / 50), // Assuming 50 calls per agent per day
      peakHours: '10:00-15:00'
    }
  };
};

const combineForecasts = (statistical, ai) => {
  return {
    callVolume: statistical.callVolume,
    aiInsights: ai.insights || [],
    recommendations: ai.recommendations || []
  };
};

const calculateForecastConfidence = (dataPoints, timeframe) => {
  const baseConfidence = Math.min(0.8, dataPoints / 180);
  const timeframeFactor = timeframe === '1month' ? 1 : timeframe === '3months' ? 0.8 : 0.6;
  return baseConfidence * timeframeFactor;
};

module.exports = {
  initializePredictiveModels,
  predictCallVolume,
  predictEscalationProbability,
  predictCustomerSatisfaction,
  analyzeSeasonalTrends,
  generateBusinessForecasts
};
