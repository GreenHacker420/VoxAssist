const geminiService = require('./geminiService');
const elevenLabsService = require('./elevenlabsService');
const twilioService = require('./twilioService');
const db = require('../database/connection');
const logger = require('../utils/logger');

let io = null;

// Initialize io instance
const setSocketIO = (socketIO) => {
  io = socketIO;
};

const getSocketIO = () => {
  return io;
};

class VoiceProcessingPipeline {
  constructor() {
    this.activeCalls = new Map();
    this.processingQueue = new Map();
  }

  async handleIncomingCall(callSid, from, to) {
    try {
      logger.info(`Processing incoming call: ${callSid} from ${from}`);
      
      // Store call in database
      const callResult = await db.query(
        `INSERT INTO calls (call_sid, customer_phone, twilio_phone, status, start_time) 
         VALUES ($1, $2, $3, 'active', NOW()) RETURNING id`,
        [callSid, from, to]
      );
      
      const callId = callResult.rows[0].id;
      
      // Initialize call session
      this.activeCalls.set(callSid, {
        callId,
        customerPhone: from,
        twilioPhone: to,
        conversationHistory: [],
        currentContext: {},
        startTime: new Date()
      });

      // Emit real-time update
      const socketIO = getSocketIO();
      if (socketIO) {
        socketIO.emit('new-call', {
          id: callId,
          callSid,
          customerPhone: from,
          status: 'active',
          duration: 0,
          startTime: new Date()
        });
      }

      // Generate welcome message
      const welcomeMessage = "Hello! I'm VoxAssist, your AI support agent. How can I help you today?";
      
      // Convert to speech and return TwiML
      return await this.generateResponseTwiML(callSid, welcomeMessage, {
        isWelcome: true,
        action: '/api/voice/process-speech'
      });

    } catch (error) {
      logger.error(`Error handling incoming call: ${error.message}`);
      throw error;
    }
  }

  async processSpeechInput(callSid, speechResult, confidence) {
    try {
      const callSession = this.activeCalls.get(callSid);
      if (!callSession) {
        throw new Error('Call session not found');
      }

      logger.info(`Processing speech: ${speechResult} (confidence: ${confidence})`);

      // Store customer interaction
      await this.storeInteraction(callSession.callId, 'customer', speechResult, confidence);

      // Add to conversation history
      callSession.conversationHistory.push({
        speaker: 'customer',
        content: speechResult,
        timestamp: new Date(),
        confidence
      });

      // Process with Gemini AI
      const aiResponse = await geminiService.processCustomerQuery(
        speechResult, 
        {
          conversationHistory: callSession.conversationHistory,
          customerPhone: callSession.customerPhone,
          callDuration: Date.now() - callSession.startTime.getTime()
        }
      );

      // Store AI interaction
      await this.storeInteraction(
        callSession.callId, 
        'ai', 
        aiResponse.response, 
        aiResponse.confidence,
        aiResponse.intent,
        this.calculateSentiment(aiResponse.response)
      );

      // Add AI response to conversation history
      callSession.conversationHistory.push({
        speaker: 'ai',
        content: aiResponse.response,
        timestamp: new Date(),
        confidence: aiResponse.confidence,
        intent: aiResponse.intent
      });

      // Update call session context
      callSession.currentContext = {
        lastIntent: aiResponse.intent,
        confidence: aiResponse.confidence,
        shouldEscalate: aiResponse.shouldEscalate
      };

      // Emit real-time update
      const socketIO = getSocketIO();
      if (socketIO) {
        socketIO.emit('call-update', {
          id: callSession.callId,
          lastMessage: aiResponse.response,
          confidence: aiResponse.confidence,
          intent: aiResponse.intent,
          sentiment: this.calculateSentiment(aiResponse.response)
        });
      }

      // Check if escalation is needed
      if (aiResponse.shouldEscalate) {
        return await this.handleEscalation(callSid, aiResponse.response);
      }

      // Generate TwiML response with AI-generated speech
      return await this.generateResponseTwiML(callSid, aiResponse.response, {
        action: '/api/voice/process-speech',
        confidence: aiResponse.confidence
      });

    } catch (error) {
      logger.error(`Error processing speech input: ${error.message}`);
      return this.generateErrorResponse();
    }
  }

  async generateResponseTwiML(callSid, message, options = {}) {
    try {
      // Get voice settings for the organization
      const voiceSettings = await this.getVoiceSettings(callSid);
      
      // Generate speech with ElevenLabs
      const audioResult = await elevenLabsService.textToSpeech(
        elevenLabsService.optimizeTextForSpeech(message),
        voiceSettings.voiceId,
        {
          stability: voiceSettings.stability,
          similarity_boost: voiceSettings.similarity_boost,
          style: voiceSettings.style,
          use_speaker_boost: voiceSettings.use_speaker_boost
        }
      );

      // Store audio file (implement file storage)
      const audioUrl = await this.storeAudioFile(callSid, audioResult.audioBuffer);

      // Generate TwiML with custom audio
      return twilioService.generateTwiMLWithAudio(audioUrl, {
        gather: !options.hangup,
        action: options.action,
        timeout: 5,
        speechTimeout: 'auto',
        hangup: options.hangup
      });

    } catch (error) {
      logger.error(`Error generating response TwiML: ${error.message}`);
      // Fallback to Twilio's built-in TTS
      return twilioService.generateTwiML(message, {
        gather: !options.hangup,
        action: options.action,
        hangup: options.hangup
      });
    }
  }

  async handleEscalation(callSid, message) {
    try {
      const callSession = this.activeCalls.get(callSid);
      
      // Update call status to escalated
      await db.query(
        'UPDATE calls SET status = $1 WHERE call_sid = $2',
        ['escalated', callSid]
      );

      // Emit escalation event
      io.emit('call-escalated', {
        id: callSession.callId,
        callSid,
        customerPhone: callSession.customerPhone,
        reason: message
      });

      const escalationMessage = "I'm connecting you with a human agent who can better assist you. Please hold for a moment.";
      
      return await this.generateResponseTwiML(callSid, escalationMessage, {
        action: '/api/voice/hold-music',
        hangup: false
      });

    } catch (error) {
      logger.error(`Error handling escalation: ${error.message}`);
      return this.generateErrorResponse();
    }
  }

  async endCall(callSid, reason = 'completed') {
    try {
      const callSession = this.activeCalls.get(callSid);
      if (!callSession) {
        return;
      }

      const endTime = new Date();
      const duration = Math.floor((endTime - callSession.startTime) / 1000);

      // Update call in database
      await db.query(
        'UPDATE calls SET status = $1, end_time = $2, duration = $3 WHERE call_sid = $4',
        [reason, endTime, duration, callSid]
      );

      // Generate analytics summary
      await this.generateCallAnalytics(callSession.callId, callSession);

      // Emit call ended event
      io.emit('call-ended', {
        id: callSession.callId,
        callSid,
        duration,
        reason
      });

      // Clean up session
      this.activeCalls.delete(callSid);

      logger.info(`Call ended: ${callSid}, duration: ${duration}s`);

    } catch (error) {
      logger.error(`Error ending call: ${error.message}`);
    }
  }

  async storeInteraction(callId, speaker, content, confidence, intent = null, sentiment = null) {
    try {
      const sequenceResult = await db.query(
        'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM call_interactions WHERE call_id = $1',
        [callId]
      );
      
      const sequenceNumber = sequenceResult.rows[0].next_seq;

      await db.query(
        `INSERT INTO call_interactions 
         (call_id, sequence_number, speaker, content, ai_confidence, intent, sentiment, sentiment_score) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [callId, sequenceNumber, speaker, content, confidence, intent, sentiment, this.getSentimentScore(sentiment)]
      );

    } catch (error) {
      logger.error(`Error storing interaction: ${error.message}`);
    }
  }

  async getVoiceSettings(callSid) {
    try {
      // Get organization from call
      const result = await db.query(
        `SELECT vs.* FROM voice_settings vs 
         JOIN calls c ON c.organization_id = vs.organization_id 
         WHERE c.call_sid = $1 AND vs.active = true 
         ORDER BY vs.created_at DESC LIMIT 1`,
        [callSid]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Return default settings
      return {
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      };

    } catch (error) {
      logger.error(`Error getting voice settings: ${error.message}`);
      return {
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      };
    }
  }

  async storeAudioFile(callSid, audioBuffer) {
    // Implement file storage (AWS S3, local storage, etc.)
    // For now, return a placeholder URL
    const filename = `${callSid}_${Date.now()}.mp3`;
    const audioUrl = `${process.env.BASE_URL}/api/audio/${filename}`;
    
    // TODO: Implement actual file storage
    // await fs.writeFile(`./uploads/audio/${filename}`, audioBuffer);
    
    return audioUrl;
  }

  calculateSentiment(text) {
    // Simple sentiment analysis - can be enhanced with ML models
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thank', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'hate', 'problem'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  getSentimentScore(sentiment) {
    switch (sentiment) {
      case 'positive': return 0.8;
      case 'negative': return 0.2;
      default: return 0.5;
    }
  }

  generateErrorResponse() {
    return twilioService.generateTwiML(
      "I'm sorry, I'm experiencing technical difficulties. Please try calling back in a few minutes.",
      { hangup: true }
    );
  }

  async generateCallAnalytics(callId, callSession) {
    try {
      const totalInteractions = callSession.conversationHistory.length;
      const aiInteractions = callSession.conversationHistory.filter(h => h.speaker === 'ai').length;
      const avgConfidence = callSession.conversationHistory
        .filter(h => h.confidence)
        .reduce((sum, h) => sum + h.confidence, 0) / aiInteractions || 0;

      // Store analytics summary
      await db.query(
        `INSERT INTO call_analytics 
         (call_id, total_interactions, ai_interactions, avg_confidence, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [callId, totalInteractions, aiInteractions, avgConfidence]
      );

    } catch (error) {
      logger.error(`Error generating call analytics: ${error.message}`);
    }
  }

  getActiveCallsCount() {
    return this.activeCalls.size;
  }

  getActiveCalls() {
    return Array.from(this.activeCalls.entries()).map(([callSid, session]) => ({
      callSid,
      customerPhone: session.customerPhone,
      duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
      status: 'active',
      confidence: session.currentContext.confidence || 0,
      intent: session.currentContext.lastIntent || 'general'
    }));
  }
}

const pipeline = new VoiceProcessingPipeline();
pipeline.setSocketIO = setSocketIO;
pipeline.getSocketIO = getSocketIO;

module.exports = pipeline;
