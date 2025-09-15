const logger = require('../utils/logger');

// Import AI services
let geminiService;
try {
  geminiService = require('./geminiService');
} catch (error) {
  logger.warn('Gemini service not available, using mock responses');
  geminiService = {
    processCustomerQuery: async (query, context) => ({
      response: `Thank you for saying: "${query}". This is a demo AI response.`,
      intent: 'general_inquiry',
      confidence: 0.85,
      shouldEscalate: false
    })
  };
}

/**
 * Real-time AI Service for Voice Conversations
 * Handles continuous conversation context and generates real-time responses
 */
class RealTimeAIService {
  constructor() {
    this.activeConversations = new Map();
    this.conversationTimeouts = new Map();
    this.maxContextLength = 10; // Maximum number of conversation turns to keep
    this.responseTimeout = 30000; // 30 seconds timeout for AI responses
  }

  /**
   * Initialize a new conversation
   */
  initializeConversation(callId, options = {}) {
    const conversation = {
      callId,
      startTime: new Date(),
      lastActivity: new Date(),
      context: {
        conversationHistory: [],
        userProfile: options.userProfile || {},
        callMetadata: options.callMetadata || {},
        preferences: options.preferences || {}
      },
      state: {
        currentTopic: null,
        userIntent: null,
        conversationPhase: 'greeting', // greeting, inquiry, resolution, closing
        escalationRequested: false,
        satisfactionScore: null
      },
      metrics: {
        responseCount: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        userSatisfactionIndicators: []
      }
    };

    this.activeConversations.set(callId, conversation);
    this.resetConversationTimeout(callId);

    logger.info(`Initialized AI conversation for call: ${callId}`);
    return conversation;
  }

  /**
   * Process user input and generate AI response
   */
  async processUserInput(callId, userMessage, options = {}) {
    const startTime = Date.now();

    try {
      let conversation = this.activeConversations.get(callId);
      
      if (!conversation) {
        conversation = this.initializeConversation(callId, options);
      }

      // Update last activity
      conversation.lastActivity = new Date();
      this.resetConversationTimeout(callId);

      // Add user message to conversation history
      const userEntry = {
        speaker: 'user',
        text: userMessage,
        timestamp: new Date(),
        confidence: options.confidence || 0.9,
        metadata: options.metadata || {}
      };

      conversation.context.conversationHistory.push(userEntry);

      // Analyze user intent and update conversation state
      await this.analyzeUserIntent(conversation, userMessage);

      // Generate AI response
      const aiResponse = await this.generateAIResponse(conversation, userMessage);

      // Add AI response to conversation history
      const aiEntry = {
        speaker: 'ai',
        text: aiResponse.response,
        timestamp: new Date(),
        confidence: aiResponse.confidence,
        intent: aiResponse.intent,
        metadata: {
          processingTime: Date.now() - startTime,
          shouldEscalate: aiResponse.shouldEscalate
        }
      };

      conversation.context.conversationHistory.push(aiEntry);

      // Update conversation metrics
      this.updateConversationMetrics(conversation, Date.now() - startTime);

      // Trim conversation history if too long
      this.trimConversationHistory(conversation);

      // Update conversation state based on AI response
      this.updateConversationState(conversation, aiResponse);

      logger.info(`Generated AI response for call ${callId} in ${Date.now() - startTime}ms`);

      return {
        response: aiResponse.response,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        shouldEscalate: aiResponse.shouldEscalate,
        conversationPhase: conversation.state.conversationPhase,
        processingTime: Date.now() - startTime,
        metadata: {
          responseCount: conversation.metrics.responseCount,
          averageResponseTime: conversation.metrics.averageResponseTime
        }
      };

    } catch (error) {
      logger.error(`Error processing user input for call ${callId}:`, error);
      
      // Return fallback response
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Could you please repeat that?",
        intent: 'error_recovery',
        confidence: 0.5,
        shouldEscalate: false,
        conversationPhase: 'error',
        processingTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Analyze user intent and update conversation state
   */
  async analyzeUserIntent(conversation, userMessage) {
    try {
      // Simple intent analysis - in production, use more sophisticated NLP
      const message = userMessage.toLowerCase();
      
      if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        conversation.state.conversationPhase = 'greeting';
        conversation.state.userIntent = 'greeting';
      } else if (message.includes('help') || message.includes('support') || message.includes('problem')) {
        conversation.state.conversationPhase = 'inquiry';
        conversation.state.userIntent = 'help_request';
      } else if (message.includes('thank') || message.includes('bye') || message.includes('goodbye')) {
        conversation.state.conversationPhase = 'closing';
        conversation.state.userIntent = 'closing';
      } else if (message.includes('human') || message.includes('agent') || message.includes('transfer')) {
        conversation.state.escalationRequested = true;
        conversation.state.userIntent = 'escalation_request';
      } else {
        conversation.state.conversationPhase = 'inquiry';
        conversation.state.userIntent = 'general_inquiry';
      }

    } catch (error) {
      logger.error('Error analyzing user intent:', error);
    }
  }

  /**
   * Generate AI response using Gemini
   */
  async generateAIResponse(conversation, userMessage) {
    try {
      // Build context for AI - only include user messages to avoid loops
      const userOnlyHistory = conversation.context.conversationHistory
        .filter(entry => entry.speaker === 'user' || entry.speaker === 'customer')
        .slice(-4); // Last 4 user messages for context

      const context = {
        conversationHistory: userOnlyHistory,
        conversationPhase: conversation.state.conversationPhase,
        userIntent: conversation.state.userIntent,
        callMetadata: conversation.context.callMetadata,
        userProfile: conversation.context.userProfile,
        escalationRequested: conversation.state.escalationRequested,
        currentUserMessage: userMessage // Explicitly pass current message
      };

      // Generate response using Gemini
      const aiResponse = await geminiService.processCustomerQuery(userMessage, context);

      return aiResponse;

    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Update conversation metrics
   */
  updateConversationMetrics(conversation, responseTime) {
    conversation.metrics.responseCount++;
    conversation.metrics.totalResponseTime += responseTime;
    conversation.metrics.averageResponseTime = 
      conversation.metrics.totalResponseTime / conversation.metrics.responseCount;
  }

  /**
   * Trim conversation history to maintain performance
   */
  trimConversationHistory(conversation) {
    if (conversation.context.conversationHistory.length > this.maxContextLength * 2) {
      // Keep the first message (usually greeting) and recent messages
      const firstMessage = conversation.context.conversationHistory[0];
      const recentMessages = conversation.context.conversationHistory.slice(-this.maxContextLength);
      
      conversation.context.conversationHistory = [firstMessage, ...recentMessages];
    }
  }

  /**
   * Update conversation state based on AI response
   */
  updateConversationState(conversation, aiResponse) {
    if (aiResponse.shouldEscalate) {
      conversation.state.escalationRequested = true;
    }

    // Update current topic based on intent
    if (aiResponse.intent) {
      conversation.state.currentTopic = aiResponse.intent;
    }
  }

  /**
   * Get conversation context
   */
  getConversationContext(callId) {
    return this.activeConversations.get(callId);
  }

  /**
   * End conversation
   */
  endConversation(callId) {
    const conversation = this.activeConversations.get(callId);
    
    if (conversation) {
      // Clear timeout
      if (this.conversationTimeouts.has(callId)) {
        clearTimeout(this.conversationTimeouts.get(callId));
        this.conversationTimeouts.delete(callId);
      }

      // Log conversation summary
      logger.info(`Ended AI conversation for call ${callId}:`, {
        duration: Date.now() - conversation.startTime.getTime(),
        responseCount: conversation.metrics.responseCount,
        averageResponseTime: conversation.metrics.averageResponseTime,
        finalPhase: conversation.state.conversationPhase
      });

      this.activeConversations.delete(callId);
    }
  }

  /**
   * Reset conversation context - clears all history and starts fresh
   */
  resetConversationContext(callId, options = {}) {
    // End existing conversation if it exists
    this.endConversation(callId);
    
    // Initialize a completely new conversation
    const newConversation = this.initializeConversation(callId, options);
    
    logger.info(`Reset conversation context for call ${callId}`);
    return newConversation;
  }

  /**
   * Reset conversation timeout
   */
  resetConversationTimeout(callId) {
    // Clear existing timeout
    if (this.conversationTimeouts.has(callId)) {
      clearTimeout(this.conversationTimeouts.get(callId));
    }

    // Set new timeout (30 minutes of inactivity)
    const timeout = setTimeout(() => {
      logger.info(`Conversation timeout for call ${callId}`);
      this.endConversation(callId);
    }, 30 * 60 * 1000);

    this.conversationTimeouts.set(callId, timeout);
  }

  /**
   * Get active conversations count
   */
  getActiveConversationsCount() {
    return this.activeConversations.size;
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(callId) {
    const conversation = this.activeConversations.get(callId);
    
    if (!conversation) {
      return null;
    }

    return {
      callId,
      duration: Date.now() - conversation.startTime.getTime(),
      messageCount: conversation.context.conversationHistory.length,
      responseCount: conversation.metrics.responseCount,
      averageResponseTime: conversation.metrics.averageResponseTime,
      conversationPhase: conversation.state.conversationPhase,
      escalationRequested: conversation.state.escalationRequested
    };
  }
}

// Create singleton instance
const realTimeAIService = new RealTimeAIService();

module.exports = realTimeAIService;
