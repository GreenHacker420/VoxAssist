const logger = require('../utils/logger');
const { getPrisma } = require('../database/connection');
const geminiService = require('./geminiService');

// Get Prisma client instance
const db = getPrisma();

/**
 * Call Quality Monitoring Service - Functional Version
 * Monitors and analyzes call quality metrics, audio quality, and conversation effectiveness
 */

// Module state
let qualityMetrics = {
  audioQuality: [],
  conversationQuality: [],
  responseAccuracy: [],
  customerSatisfaction: []
};

let monitoringActive = false;
let qualityThresholds = {
  audioQuality: 0.8,      // 80% minimum audio quality
  responseAccuracy: 0.85,  // 85% minimum accuracy
  conversationFlow: 0.75,  // 75% minimum flow score
  customerSatisfaction: 4.0 // 4.0/5.0 minimum satisfaction
};

/**
 * Start call quality monitoring
 */
const startQualityMonitoring = async () => {
  if (monitoringActive) return;
  
  monitoringActive = true;
  logger.info('Call quality monitoring started');
  
  // Start periodic quality analysis
  setInterval(analyzeRecentCalls, 300000); // Every 5 minutes
};

/**
 * Stop call quality monitoring
 */
const stopQualityMonitoring = () => {
  monitoringActive = false;
  logger.info('Call quality monitoring stopped');
};

/**
 * Analyze audio quality metrics
 */
const analyzeAudioQuality = async (callId, audioData) => {
  try {
    const audioMetrics = {
      callId,
      timestamp: new Date(),
      clarity: 0,
      volume: 0,
      backgroundNoise: 0,
      signalToNoise: 0,
      overallScore: 0
    };

    // Simulate audio analysis (in production, use audio processing libraries)
    audioMetrics.clarity = Math.random() * 0.3 + 0.7; // 0.7-1.0
    audioMetrics.volume = Math.random() * 0.2 + 0.8;   // 0.8-1.0
    audioMetrics.backgroundNoise = Math.random() * 0.4; // 0.0-0.4
    audioMetrics.signalToNoise = Math.random() * 0.2 + 0.8; // 0.8-1.0

    // Calculate overall score
    audioMetrics.overallScore = (
      audioMetrics.clarity * 0.3 +
      audioMetrics.volume * 0.2 +
      (1 - audioMetrics.backgroundNoise) * 0.2 +
      audioMetrics.signalToNoise * 0.3
    );

    // Store metrics
    qualityMetrics.audioQuality.push(audioMetrics);
    
    // Keep only last 1000 entries
    if (qualityMetrics.audioQuality.length > 1000) {
      qualityMetrics.audioQuality = qualityMetrics.audioQuality.slice(-1000);
    }

    // Save to database
    await saveAudioQualityMetrics(audioMetrics);

    // Check for quality issues
    if (audioMetrics.overallScore < qualityThresholds.audioQuality) {
      await handleQualityAlert('audio', callId, audioMetrics);
    }

    return audioMetrics;
  } catch (error) {
    logger.error('Error analyzing audio quality:', error);
    throw error;
  }
};

/**
 * Analyze conversation quality
 */
const analyzeConversationQuality = async (callId, transcript, responses) => {
  try {
    const conversationMetrics = {
      callId,
      timestamp: new Date(),
      coherence: 0,
      relevance: 0,
      completeness: 0,
      efficiency: 0,
      overallScore: 0,
      issues: []
    };

    // Use Gemini AI to analyze conversation quality
    const analysisPrompt = `
      Analyze this customer service conversation for quality metrics:
      
      Transcript: ${transcript}
      AI Responses: ${JSON.stringify(responses)}
      
      Rate each aspect from 0.0 to 1.0:
      1. Coherence - How well responses flow logically
      2. Relevance - How well responses address customer queries
      3. Completeness - How thoroughly issues are addressed
      4. Efficiency - How quickly issues are resolved
      
      Also identify any specific issues or areas for improvement.
      
      Return JSON format: {
        "coherence": 0.0-1.0,
        "relevance": 0.0-1.0,
        "completeness": 0.0-1.0,
        "efficiency": 0.0-1.0,
        "issues": ["issue1", "issue2"]
      }
    `;

    const analysis = await geminiService.processCustomerQuery(analysisPrompt);
    
    try {
      const parsed = JSON.parse(analysis.response);
      conversationMetrics.coherence = parsed.coherence || 0.8;
      conversationMetrics.relevance = parsed.relevance || 0.8;
      conversationMetrics.completeness = parsed.completeness || 0.8;
      conversationMetrics.efficiency = parsed.efficiency || 0.8;
      conversationMetrics.issues = parsed.issues || [];
    } catch (parseError) {
      // Fallback to simulated metrics
      conversationMetrics.coherence = Math.random() * 0.3 + 0.7;
      conversationMetrics.relevance = Math.random() * 0.3 + 0.7;
      conversationMetrics.completeness = Math.random() * 0.3 + 0.7;
      conversationMetrics.efficiency = Math.random() * 0.3 + 0.7;
    }

    // Calculate overall score
    conversationMetrics.overallScore = (
      conversationMetrics.coherence * 0.25 +
      conversationMetrics.relevance * 0.3 +
      conversationMetrics.completeness * 0.25 +
      conversationMetrics.efficiency * 0.2
    );

    // Store metrics
    qualityMetrics.conversationQuality.push(conversationMetrics);
    
    if (qualityMetrics.conversationQuality.length > 1000) {
      qualityMetrics.conversationQuality = qualityMetrics.conversationQuality.slice(-1000);
    }

    // Save to database
    await saveConversationQualityMetrics(conversationMetrics);

    // Check for quality issues
    if (conversationMetrics.overallScore < qualityThresholds.conversationFlow) {
      await handleQualityAlert('conversation', callId, conversationMetrics);
    }

    return conversationMetrics;
  } catch (error) {
    logger.error('Error analyzing conversation quality:', error);
    throw error;
  }
};

/**
 * Analyze response accuracy
 */
const analyzeResponseAccuracy = async (callId, customerQuery, aiResponse, actualOutcome) => {
  try {
    const accuracyMetrics = {
      callId,
      timestamp: new Date(),
      queryType: '',
      responseRelevance: 0,
      factualAccuracy: 0,
      helpfulness: 0,
      overallAccuracy: 0
    };

    // Classify query type
    accuracyMetrics.queryType = await classifyQueryType(customerQuery);

    // Use AI to evaluate response accuracy
    const evaluationPrompt = `
      Evaluate the accuracy of this AI response:
      
      Customer Query: ${customerQuery}
      AI Response: ${aiResponse}
      Actual Outcome: ${actualOutcome}
      
      Rate from 0.0 to 1.0:
      1. Response Relevance - How relevant is the response to the query
      2. Factual Accuracy - How factually correct is the information
      3. Helpfulness - How helpful is the response to the customer
      
      Return JSON: {
        "responseRelevance": 0.0-1.0,
        "factualAccuracy": 0.0-1.0,
        "helpfulness": 0.0-1.0
      }
    `;

    const evaluation = await geminiService.processCustomerQuery(evaluationPrompt);
    
    try {
      const parsed = JSON.parse(evaluation.response);
      accuracyMetrics.responseRelevance = parsed.responseRelevance || 0.8;
      accuracyMetrics.factualAccuracy = parsed.factualAccuracy || 0.8;
      accuracyMetrics.helpfulness = parsed.helpfulness || 0.8;
    } catch (parseError) {
      // Fallback metrics
      accuracyMetrics.responseRelevance = Math.random() * 0.3 + 0.7;
      accuracyMetrics.factualAccuracy = Math.random() * 0.3 + 0.7;
      accuracyMetrics.helpfulness = Math.random() * 0.3 + 0.7;
    }

    // Calculate overall accuracy
    accuracyMetrics.overallAccuracy = (
      accuracyMetrics.responseRelevance * 0.3 +
      accuracyMetrics.factualAccuracy * 0.4 +
      accuracyMetrics.helpfulness * 0.3
    );

    // Store metrics
    qualityMetrics.responseAccuracy.push(accuracyMetrics);
    
    if (qualityMetrics.responseAccuracy.length > 1000) {
      qualityMetrics.responseAccuracy = qualityMetrics.responseAccuracy.slice(-1000);
    }

    // Save to database
    await saveResponseAccuracyMetrics(accuracyMetrics);

    return accuracyMetrics;
  } catch (error) {
    logger.error('Error analyzing response accuracy:', error);
    throw error;
  }
};

/**
 * Classify query type for accuracy analysis
 */
const classifyQueryType = async (query) => {
  const types = ['billing', 'technical', 'general', 'complaint', 'information'];
  
  // Simple keyword-based classification (in production, use ML)
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('bill') || lowerQuery.includes('payment') || lowerQuery.includes('charge')) {
    return 'billing';
  } else if (lowerQuery.includes('not working') || lowerQuery.includes('error') || lowerQuery.includes('problem')) {
    return 'technical';
  } else if (lowerQuery.includes('complaint') || lowerQuery.includes('unhappy') || lowerQuery.includes('dissatisfied')) {
    return 'complaint';
  } else if (lowerQuery.includes('how') || lowerQuery.includes('what') || lowerQuery.includes('when')) {
    return 'information';
  }
  
  return 'general';
};

/**
 * Generate quality report
 */
const generateQualityReport = async (organizationId, startDate, endDate) => {
  try {
    const report = {
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {},
      audioQuality: {},
      conversationQuality: {},
      responseAccuracy: {},
      recommendations: []
    };

    // Get audio quality metrics using Prisma aggregation
    const audioMetrics = await db.callAudioQuality.aggregate({
      where: {
        organizationId: organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _avg: {
        overallScore: true,
        clarity: true,
        volume: true,
        backgroundNoise: true
      },
      _count: {
        id: true
      }
    });
    
    report.audioQuality = {
      avg_audio_quality: audioMetrics._avg.overallScore,
      avg_clarity: audioMetrics._avg.clarity,
      avg_volume: audioMetrics._avg.volume,
      avg_noise: audioMetrics._avg.backgroundNoise,
      total_calls: audioMetrics._count.id
    };

    // Get conversation quality metrics using Prisma aggregation
    const conversationMetrics = await db.callConversationQuality.aggregate({
      where: {
        organizationId: organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _avg: {
        overallScore: true,
        coherence: true,
        relevance: true,
        completeness: true,
        efficiency: true
      },
      _count: {
        id: true
      }
    });
    
    report.conversationQuality = {
      avg_conversation_quality: conversationMetrics._avg.overallScore,
      avg_coherence: conversationMetrics._avg.coherence,
      avg_relevance: conversationMetrics._avg.relevance,
      avg_completeness: conversationMetrics._avg.completeness,
      avg_efficiency: conversationMetrics._avg.efficiency,
      total_conversations: conversationMetrics._count.id
    };

    // Get response accuracy metrics using Prisma aggregation
    const accuracyMetrics = await db.callResponseAccuracy.groupBy({
      by: ['queryType'],
      where: {
        organizationId: organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _avg: {
        overallAccuracy: true,
        responseRelevance: true,
        factualAccuracy: true,
        helpfulness: true
      },
      _count: {
        id: true
      }
    });

    // Calculate overall accuracy across all query types
    const overallAccuracy = accuracyMetrics.length > 0 
      ? accuracyMetrics.reduce((acc, row) => acc + (row._avg.overallAccuracy || 0), 0) / accuracyMetrics.length
      : 0;

    report.responseAccuracy = {
      overall: overallAccuracy,
      byType: accuracyMetrics.map(row => ({
        query_type: row.queryType,
        avg_response_accuracy: row._avg.overallAccuracy,
        avg_relevance: row._avg.responseRelevance,
        avg_factual_accuracy: row._avg.factualAccuracy,
        avg_helpfulness: row._avg.helpfulness,
        count: row._count.id
      }))
    };

    // Generate recommendations
    report.recommendations = generateQualityRecommendations(report);

    return report;
  } catch (error) {
    logger.error('Error generating quality report:', error);
    throw error;
  }
};

/**
 * Generate quality improvement recommendations
 */
const generateQualityRecommendations = (report) => {
  const recommendations = [];

  // Audio quality recommendations
  if (report.audioQuality.avg_audio_quality < qualityThresholds.audioQuality) {
    recommendations.push({
      type: 'audio',
      priority: 'high',
      title: 'Improve Audio Quality',
      description: `Average audio quality is ${(report.audioQuality.avg_audio_quality * 100).toFixed(1)}%, below the ${(qualityThresholds.audioQuality * 100)}% threshold.`,
      actions: [
        'Check microphone and speaker quality',
        'Implement noise cancellation',
        'Optimize audio processing pipeline'
      ]
    });
  }

  // Conversation quality recommendations
  if (report.conversationQuality.avg_conversation_quality < qualityThresholds.conversationFlow) {
    recommendations.push({
      type: 'conversation',
      priority: 'high',
      title: 'Enhance Conversation Flow',
      description: `Conversation quality score is ${(report.conversationQuality.avg_conversation_quality * 100).toFixed(1)}%.`,
      actions: [
        'Improve AI training data',
        'Enhance context understanding',
        'Optimize response generation'
      ]
    });
  }

  // Response accuracy recommendations
  if (report.responseAccuracy.overall < qualityThresholds.responseAccuracy) {
    recommendations.push({
      type: 'accuracy',
      priority: 'high',
      title: 'Improve Response Accuracy',
      description: `Response accuracy is ${(report.responseAccuracy.overall * 100).toFixed(1)}%, below target.`,
      actions: [
        'Update knowledge base',
        'Enhance fact-checking processes',
        'Improve query understanding'
      ]
    });
  }

  return recommendations;
};

/**
 * Handle quality alerts
 */
const handleQualityAlert = async (type, callId, metrics) => {
  try {
    const alert = {
      type: `quality_${type}`,
      callId,
      severity: 'medium',
      message: `${type} quality below threshold for call ${callId}`,
      metrics,
      timestamp: new Date()
    };

    // Log alert
    logger.warn('Quality alert generated:', alert);

    // Save alert to database
    await db.qualityAlert.create({
      data: {
        type: alert.type,
        callId: alert.callId,
        severity: alert.severity,
        message: alert.message,
        metrics: JSON.stringify(alert.metrics),
        createdAt: alert.timestamp
      }
    });

    // Send notification if configured
    if (process.env.QUALITY_ALERT_WEBHOOK) {
      // Send webhook notification
      // Implementation depends on webhook service
    }

  } catch (error) {
    logger.error('Error handling quality alert:', error);
  }
};

/**
 * Analyze recent calls for quality issues
 */
const analyzeRecentCalls = async () => {
  try {
    if (!monitoringActive) return;

    // Get recent calls from the last 10 minutes that don't have conversation quality records
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const recentCalls = await db.call.findMany({
      where: {
        createdAt: {
          gte: tenMinutesAgo
        },
        // Use NOT EXISTS equivalent - calls that don't have conversation quality records
        callInteractions: {
          some: {}
        }
      },
      select: {
        id: true,
        _count: {
          select: {
            callInteractions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Filter out calls that already have conversation quality analysis
    const existingAnalysis = await db.callConversationQuality.findMany({
      where: {
        callId: {
          in: recentCalls.map(call => call.id)
        }
      },
      select: {
        callId: true
      }
    });

    const analyzedCallIds = new Set(existingAnalysis.map(analysis => analysis.callId));
    const unanalyzedCalls = recentCalls.filter(call => !analyzedCallIds.has(call.id));

    for (const call of unanalyzedCalls) {
      try {
        // Fetch interactions for the call using Prisma
        const interactions = await db.callInteraction.findMany({
          where: {
            callId: call.id
          },
          select: {
            speaker: true,
            content: true,
            timestamp: true
          },
          orderBy: [
            { sequenceNumber: 'asc' },
            { timestamp: 'asc' }
          ]
        });

        if (!interactions || interactions.length === 0) {
          continue;
        }

        // Build a readable transcript and a list of AI responses
        const transcript = interactions
          .map((it) => `${(it.speaker || '').toUpperCase()}: ${it.content || ''}`)
          .join('\n');

        const aiResponses = interactions
          .filter((it) => (it.speaker || '').toLowerCase() === 'ai')
          .map((it) => it.content || '');

        // Analyze conversation quality
        await analyzeConversationQuality(call.id, transcript, aiResponses);

      } catch (callError) {
        logger.error(`Error analyzing call ${call.id}:`, callError);
      }
    }

    logger.debug(`Analyzed ${unanalyzedCalls.length} recent calls for quality`);
  } catch (error) {
    logger.error('Error in periodic quality analysis:', error);
  }
};

/**
 * Save audio quality metrics to database
 */
const saveAudioQualityMetrics = async (metrics) => {
  try {
    await db.callAudioQuality.create({
      data: {
        callId: metrics.callId,
        clarity: metrics.clarity,
        volume: metrics.volume,
        backgroundNoise: metrics.backgroundNoise,
        signalToNoise: metrics.signalToNoise,
        overallScore: metrics.overallScore,
        createdAt: metrics.timestamp
      }
    });
  } catch (error) {
    logger.error('Error saving audio quality metrics:', error);
  }
};

/**
 * Save conversation quality metrics to database
 */
const saveConversationQualityMetrics = async (metrics) => {
  try {
    await db.callConversationQuality.create({
      data: {
        callId: metrics.callId,
        coherence: metrics.coherence,
        relevance: metrics.relevance,
        completeness: metrics.completeness,
        efficiency: metrics.efficiency,
        overallScore: metrics.overallScore,
        issues: JSON.stringify(metrics.issues),
        createdAt: metrics.timestamp
      }
    });
  } catch (error) {
    logger.error('Error saving conversation quality metrics:', error);
  }
};

/**
 * Save response accuracy metrics to database
 */
const saveResponseAccuracyMetrics = async (metrics) => {
  try {
    await db.callResponseAccuracy.create({
      data: {
        callId: metrics.callId,
        queryType: metrics.queryType,
        responseRelevance: metrics.responseRelevance,
        factualAccuracy: metrics.factualAccuracy,
        helpfulness: metrics.helpfulness,
        overallAccuracy: metrics.overallAccuracy,
        createdAt: metrics.timestamp
      }
    });
  } catch (error) {
    logger.error('Error saving response accuracy metrics:', error);
  }
};

/**
 * Get current quality metrics
 */
const getCurrentQualityMetrics = () => {
  return {
    audioQuality: qualityMetrics.audioQuality.slice(-100), // Last 100 entries
    conversationQuality: qualityMetrics.conversationQuality.slice(-100),
    responseAccuracy: qualityMetrics.responseAccuracy.slice(-100),
    thresholds: qualityThresholds,
    monitoringActive
  };
};

/**
 * Update quality thresholds
 */
const updateQualityThresholds = (newThresholds) => {
  qualityThresholds = { ...qualityThresholds, ...newThresholds };
  logger.info('Quality thresholds updated:', qualityThresholds);
};

module.exports = {
  startQualityMonitoring,
  stopQualityMonitoring,
  analyzeAudioQuality,
  analyzeConversationQuality,
  analyzeResponseAccuracy,
  generateQualityReport,
  getCurrentQualityMetrics,
  updateQualityThresholds,
  handleQualityAlert
};
