const logger = require('../utils/logger');
const emotionDetection = require('./emotionDetection');
const {
  broadcastDemoCallTranscript,
  broadcastDemoCallSentiment,
  broadcastVoiceInteractionStatus,
  broadcastAudioResponse
} = require('../websocket/callMonitoring');
const geminiService = require('./geminiService');
const elevenLabsService = require('./elevenLabsService');
const fs = require('fs').promises;
const path = require('path');

/**
 * Demo Call Service
 * Handles demo call orchestration with real-time features
 */

class DemoCallService {
  constructor() {
    this.activeDemoCalls = new Map();
    this.voiceInteractionMode = new Map(); // Track which calls are using voice interaction
    this.audioQueue = new Map(); // Queue for audio playback
    this.processingQueue = new Map(); // Track processing state
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
   * Process customer speech input for real-time voice interaction
   */
  async processCustomerSpeech(callId, transcript, isInterim = false) {
    try {
      const demoCall = this.activeDemoCalls.get(callId);
      if (!demoCall) {
        throw new Error('Demo call not found');
      }

      // Enable voice interaction mode for this call
      this.voiceInteractionMode.set(callId, true);

      logger.info(`Processing customer speech for demo call ${callId}: "${transcript}" (interim: ${isInterim})`);

      // Don't process interim results for AI response generation
      if (isInterim) {
        // Broadcast listening status for interim results
        broadcastVoiceInteractionStatus(callId, 'listening');
        return {
          callId,
          customerTranscript: transcript,
          isProcessing: false,
          isInterim: true
        };
      }

      // Mark as processing
      this.processingQueue.set(callId, true);
      broadcastVoiceInteractionStatus(callId, 'processing');

      // Create customer transcript entry
      const customerTranscriptEntry = {
        id: `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        speaker: 'customer',
        text: transcript,
        timestamp: new Date().toISOString(),
        confidence: 0.85 + Math.random() * 0.1,
        sentiment: await this.analyzeSentiment(transcript),
        sentimentScore: await this.calculateSentimentScore(transcript),
        emotions: await this.analyzeEmotions(transcript)
      };

      // Add to transcript
      demoCall.transcript.push(customerTranscriptEntry);

      // Update overall sentiment
      this.updateOverallSentiment(demoCall, customerTranscriptEntry);

      // Broadcast customer transcript update
      broadcastDemoCallTranscript(callId, customerTranscriptEntry, demoCall.overallSentiment);

      // Generate AI response using Gemini
      const aiResponse = await this.generateAIResponse(callId, transcript, demoCall);

      // Create AI transcript entry
      const aiTranscriptEntry = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        speaker: 'ai',
        text: aiResponse.response,
        timestamp: new Date().toISOString(),
        confidence: aiResponse.confidence || 0.95,
        sentiment: 'positive',
        sentimentScore: 0.8,
        emotions: { joy: 0.7, anger: 0.1, fear: 0.1, sadness: 0.1, surprise: 0.0 }
      };

      // Add AI response to transcript
      demoCall.transcript.push(aiTranscriptEntry);

      // Update overall sentiment with AI response
      this.updateOverallSentiment(demoCall, aiTranscriptEntry);

      // Generate audio for AI response
      broadcastVoiceInteractionStatus(callId, 'speaking');
      const audioUrl = await this.generateAudioResponse(aiResponse.response, callId);

      // Broadcast AI transcript update
      broadcastDemoCallTranscript(callId, aiTranscriptEntry, demoCall.overallSentiment);

      // Broadcast audio response ready
      if (audioUrl) {
        broadcastAudioResponse(callId, audioUrl, aiTranscriptEntry.id);
      }

      // Clear processing state
      this.processingQueue.delete(callId);
      broadcastVoiceInteractionStatus(callId, 'idle');

      return {
        callId,
        customerTranscript: transcript,
        aiResponse: aiResponse.response,
        audioUrl,
        sentiment: demoCall.overallSentiment,
        isProcessing: false,
        transcriptId: aiTranscriptEntry.id
      };

    } catch (error) {
      logger.error(`Error processing customer speech for demo call ${callId}: ${error.message}`);
      this.processingQueue.delete(callId);
      throw error;
    }
  }

  /**
   * Generate AI response using Gemini API
   */
  async generateAIResponse(callId, customerInput, demoCall) {
    try {
      // Build conversation context
      const conversationHistory = demoCall.transcript.slice(-6).map(entry => ({
        speaker: entry.speaker,
        content: entry.text,
        timestamp: entry.timestamp
      }));

      const context = {
        conversationHistory,
        customerPhone: demoCall.metadata?.customerPhone || '+1-555-DEMO',
        callDuration: Date.now() - new Date(demoCall.startTime).getTime(),
        overallSentiment: demoCall.overallSentiment,
        isDemo: true
      };

      // Use Gemini service to generate response
      const aiResponse = await geminiService.processCustomerQuery(customerInput, context);

      logger.info(`Generated AI response for demo call ${callId}: "${aiResponse.response.substring(0, 100)}..."`);

      return aiResponse;

    } catch (error) {
      logger.error(`Error generating AI response for demo call ${callId}: ${error.message}`);

      // Fallback response
      return {
        response: "I understand your concern. Let me help you with that. Could you please provide more details?",
        intent: 'general_inquiry',
        confidence: 0.8,
        shouldEscalate: false
      };
    }
  }

  /**
   * Generate audio response using ElevenLabs TTS
   */
  async generateAudioResponse(text, callId) {
    try {
      // Generate speech using ElevenLabs
      const audioResult = await elevenLabsService.textToSpeech(text, null, {
        stability: 0.6,
        similarity_boost: 0.7,
        style: 0.2,
        use_speaker_boost: true
      });

      // Save audio file
      const audioFileName = `demo-call-${callId}-${Date.now()}.mp3`;
      const audioPath = path.join(process.cwd(), 'public', 'audio', audioFileName);

      // Ensure audio directory exists
      await fs.mkdir(path.dirname(audioPath), { recursive: true });

      // Write audio file
      await fs.writeFile(audioPath, audioResult.audioBuffer);

      const audioUrl = `/audio/${audioFileName}`;
      logger.info(`Generated audio response for demo call ${callId}: ${audioUrl}`);

      return audioUrl;

    } catch (error) {
      logger.error(`Error generating audio response for demo call ${callId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text) {
    try {
      const analysis = await emotionDetection.analyzeEmotion(text, 'demo-call');

      if (analysis.overallSentiment > 0.6) return 'positive';
      if (analysis.overallSentiment < 0.4) return 'negative';
      return 'neutral';
    } catch (error) {
      logger.warn(`Error analyzing sentiment: ${error.message}`);
      return 'neutral';
    }
  }

  /**
   * Calculate sentiment score
   */
  async calculateSentimentScore(text) {
    try {
      const analysis = await emotionDetection.analyzeEmotion(text, 'demo-call');
      return analysis.overallSentiment || 0.5;
    } catch (error) {
      logger.warn(`Error calculating sentiment score: ${error.message}`);
      return 0.5;
    }
  }

  /**
   * Analyze emotions in text
   */
  async analyzeEmotions(text) {
    try {
      const analysis = await emotionDetection.analyzeEmotion(text, 'demo-call');
      return analysis.emotions || { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 };
    } catch (error) {
      logger.warn(`Error analyzing emotions: ${error.message}`);
      return { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 };
    }
  }

  /**
   * Enable voice interaction mode for a demo call
   */
  enableVoiceInteraction(callId) {
    this.voiceInteractionMode.set(callId, true);

    // Stop any existing conversation simulation
    const demoCall = this.activeDemoCalls.get(callId);
    if (demoCall && demoCall.intervalId) {
      clearTimeout(demoCall.intervalId);
      demoCall.intervalId = null;
    }

    // Broadcast voice interaction enabled
    broadcastVoiceInteractionStatus(callId, 'idle');

    logger.info(`Voice interaction enabled for demo call: ${callId}`);
  }

  /**
   * Disable voice interaction mode for a demo call
   */
  disableVoiceInteraction(callId) {
    this.voiceInteractionMode.delete(callId);
    logger.info(`Voice interaction disabled for demo call: ${callId}`);
  }

  /**
   * Check if call is in voice interaction mode
   */
  isVoiceInteractionEnabled(callId) {
    return this.voiceInteractionMode.has(callId);
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
    this.voiceInteractionMode.clear();
    this.audioQueue.clear();
    this.processingQueue.clear();
    logger.info('Demo call service cleaned up');
  }
}

// Create singleton instance
const demoCallService = new DemoCallService();

module.exports = demoCallService;
