const logger = require('../utils/logger');
const emotionDetection = require('./emotionDetection');
const { broadcastDemoCallTranscript, broadcastDemoCallSentiment } = require('../websocket/callMonitoring');

/**
 * Demo Call Service
 * Handles demo call orchestration with real-time features
 */

class DemoCallService {
  constructor() {
    this.activeDemoCalls = new Map();
    this.conversationTemplates = {
      CUSTOMER_SUPPORT: [
        {
          speaker: 'ai',
          text: "Hello! I'm VoxAssist, your AI support agent. How can I help you today?",
          sentiment: 'positive',
          sentimentScore: 0.8,
          emotions: { joy: 0.7, anger: 0.1, fear: 0.1, sadness: 0.1, surprise: 0.0 }
        },
        {
          speaker: 'customer',
          text: "Hi, I'm having trouble with my account login. I can't seem to access my dashboard.",
          sentiment: 'negative',
          sentimentScore: 0.3,
          emotions: { joy: 0.1, anger: 0.4, fear: 0.2, sadness: 0.2, surprise: 0.1 }
        },
        {
          speaker: 'ai',
          text: "I understand your frustration with the login issue. Let me help you resolve this. Can you tell me what error message you're seeing?",
          sentiment: 'positive',
          sentimentScore: 0.7,
          emotions: { joy: 0.6, anger: 0.1, fear: 0.1, sadness: 0.1, surprise: 0.1 }
        },
        {
          speaker: 'customer',
          text: "It says 'Invalid credentials' but I'm sure I'm using the right password.",
          sentiment: 'negative',
          sentimentScore: 0.4,
          emotions: { joy: 0.1, anger: 0.3, fear: 0.2, sadness: 0.3, surprise: 0.1 }
        },
        {
          speaker: 'ai',
          text: "That's definitely frustrating. Let me check your account status. I can see there might be a temporary lock. I'll reset it for you right now.",
          sentiment: 'positive',
          sentimentScore: 0.8,
          emotions: { joy: 0.7, anger: 0.1, fear: 0.1, sadness: 0.1, surprise: 0.0 }
        },
        {
          speaker: 'customer',
          text: "Oh great! That would be really helpful. Thank you so much.",
          sentiment: 'positive',
          sentimentScore: 0.9,
          emotions: { joy: 0.8, anger: 0.1, fear: 0.0, sadness: 0.0, surprise: 0.1 }
        },
        {
          speaker: 'ai',
          text: "Perfect! I've reset your account. You should be able to log in now. Is there anything else I can help you with today?",
          sentiment: 'positive',
          sentimentScore: 0.9,
          emotions: { joy: 0.8, anger: 0.0, fear: 0.0, sadness: 0.0, surprise: 0.2 }
        },
        {
          speaker: 'customer',
          text: "That worked perfectly! You've been incredibly helpful. Thank you!",
          sentiment: 'positive',
          sentimentScore: 0.95,
          emotions: { joy: 0.9, anger: 0.0, fear: 0.0, sadness: 0.0, surprise: 0.1 }
        }
      ]
    };
  }

  /**
   * Start a new demo call with real-time simulation
   */
  async startDemoCall(callId, userId, template = 'CUSTOMER_SUPPORT') {
    try {
      const demoCall = {
        id: callId,
        userId,
        template,
        status: 'active',
        startTime: new Date(),
        currentMessageIndex: 0,
        transcript: [],
        overallSentiment: {
          overall: 'neutral',
          score: 0.5,
          emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
        },
        intervalId: null
      };

      this.activeDemoCalls.set(callId, demoCall);

      // Start the conversation simulation
      this.startConversationSimulation(callId);

      logger.info(`Demo call started: ${callId} for user ${userId}`);
      return demoCall;

    } catch (error) {
      logger.error(`Error starting demo call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start conversation simulation with realistic timing
   */
  startConversationSimulation(callId) {
    const demoCall = this.activeDemoCalls.get(callId);
    if (!demoCall) return;

    const template = this.conversationTemplates[demoCall.template];
    if (!template) return;

    const sendNextMessage = () => {
      if (demoCall.status !== 'active' || demoCall.currentMessageIndex >= template.length) {
        this.endDemoCall(callId);
        return;
      }

      const message = template[demoCall.currentMessageIndex];
      const transcriptEntry = {
        id: `msg-${Date.now()}-${demoCall.currentMessageIndex}`,
        speaker: message.speaker,
        text: message.text,
        timestamp: new Date().toISOString(),
        confidence: 0.85 + Math.random() * 0.1,
        sentiment: message.sentiment,
        sentimentScore: message.sentimentScore,
        emotions: message.emotions
      };

      // Add to transcript
      demoCall.transcript.push(transcriptEntry);
      demoCall.currentMessageIndex++;

      // Update overall sentiment
      this.updateOverallSentiment(demoCall, message);

      // Broadcast transcript update
      broadcastDemoCallTranscript(callId, transcriptEntry, demoCall.overallSentiment);

      // Broadcast sentiment update
      broadcastDemoCallSentiment(callId, demoCall.overallSentiment);

      logger.info(`Demo call ${callId} - Message sent: ${message.speaker}`);

      // Schedule next message with realistic delay
      const delay = this.getRealisticDelay(message.speaker);
      demoCall.intervalId = setTimeout(sendNextMessage, delay);
    };

    // Start with initial delay
    demoCall.intervalId = setTimeout(sendNextMessage, 2000);
  }

  /**
   * Get realistic delay between messages
   */
  getRealisticDelay(speaker) {
    if (speaker === 'ai') {
      // AI responses are faster but still need processing time
      return 2000 + Math.random() * 1000; // 2-3 seconds
    } else {
      // Customer responses take longer (thinking time)
      return 3000 + Math.random() * 2000; // 3-5 seconds
    }
  }

  /**
   * Update overall sentiment based on new message
   */
  updateOverallSentiment(demoCall, message) {
    const totalMessages = demoCall.transcript.length;
    const currentWeight = 1 / totalMessages;
    const previousWeight = (totalMessages - 1) / totalMessages;
    
    // Update sentiment score (weighted average)
    demoCall.overallSentiment.score = 
      (demoCall.overallSentiment.score * previousWeight) + 
      (message.sentimentScore * currentWeight);

    // Update overall sentiment category
    if (demoCall.overallSentiment.score > 0.6) {
      demoCall.overallSentiment.overall = 'positive';
    } else if (demoCall.overallSentiment.score < 0.4) {
      demoCall.overallSentiment.overall = 'negative';
    } else {
      demoCall.overallSentiment.overall = 'neutral';
    }

    // Update emotions (weighted average)
    Object.keys(demoCall.overallSentiment.emotions).forEach(emotion => {
      demoCall.overallSentiment.emotions[emotion] = 
        (demoCall.overallSentiment.emotions[emotion] * previousWeight) + 
        (message.emotions[emotion] * currentWeight);
    });
  }

  /**
   * End a demo call
   */
  async endDemoCall(callId) {
    try {
      const demoCall = this.activeDemoCalls.get(callId);
      if (!demoCall) return;

      // Clear any pending intervals
      if (demoCall.intervalId) {
        clearTimeout(demoCall.intervalId);
      }

      // Update status
      demoCall.status = 'completed';
      demoCall.endTime = new Date();

      // Generate AI insights
      demoCall.aiInsights = this.generateAIInsights(demoCall);

      logger.info(`Demo call ended: ${callId}`);
      return demoCall;

    } catch (error) {
      logger.error(`Error ending demo call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate AI insights for completed demo call
   */
  generateAIInsights(demoCall) {
    const duration = Math.round((demoCall.endTime - demoCall.startTime) / 1000);
    const messageCount = demoCall.transcript.length;
    const sentimentScore = Math.round(demoCall.overallSentiment.score * 100);
    
    return {
      summary: `Demo call completed successfully. Duration: ${duration}s, Messages: ${messageCount}`,
      overallSentiment: demoCall.overallSentiment.overall,
      sentimentScore: sentimentScore,
      keyMetrics: {
        duration,
        messageCount,
        averageResponseTime: '2.5s',
        customerSatisfaction: sentimentScore
      },
      recommendations: [
        'Demo call showcased real-time transcript capabilities',
        'Sentiment analysis performed accurately throughout conversation',
        'AI responses demonstrated natural conversation flow'
      ]
    };
  }

  /**
   * Get demo call details
   */
  getDemoCall(callId) {
    return this.activeDemoCalls.get(callId);
  }

  /**
   * Get all active demo calls for a user
   */
  getUserDemoCalls(userId) {
    return Array.from(this.activeDemoCalls.values())
      .filter(call => call.userId === userId);
  }

  /**
   * Force end all demo calls for cleanup
   */
  cleanup() {
    for (const [callId, demoCall] of this.activeDemoCalls.entries()) {
      if (demoCall.intervalId) {
        clearTimeout(demoCall.intervalId);
      }
    }
    this.activeDemoCalls.clear();
    logger.info('Demo call service cleaned up');
  }
}

// Create singleton instance
const demoCallService = new DemoCallService();

module.exports = demoCallService;
