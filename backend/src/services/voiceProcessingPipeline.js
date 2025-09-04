const geminiService = require('./geminiService');
const elevenLabsService = require('./elevenlabsService');
const twilioService = require('./twilioService');
const db = require('../database/connection');
const logger = require('../utils/logger');

// Module state
let io = null;
const activeCalls = new Map();
const processingQueue = new Map();

/**
 * Initialize Socket.IO instance
 */
const setSocketIO = (socketIO) => {
  io = socketIO;
};

/**
 * Get Socket.IO instance
 */
const getSocketIO = () => {
  return io;
};

/**
 * Handle incoming call
 */
const handleIncomingCall = async (callSid, from, to) => {
  try {
    logger.info(`Processing incoming call: ${callSid} from ${from}`);
    
    // Store call in database (MySQL syntax)
    const callResult = await db.query(
      `INSERT INTO calls (call_sid, customer_phone, twilio_phone, status, start_time) 
       VALUES (?, ?, ?, 'active', NOW())`,
      [callSid, from, to]
    );
    
    const callId = callResult.insertId;
    
    // Initialize call session
    activeCalls.set(callSid, {
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
    return await generateResponseTwiML(callSid, welcomeMessage, {
      isWelcome: true,
      action: '/api/voice/process-speech'
    });

  } catch (error) {
    logger.error(`Error handling incoming call: ${error.message}`);
    throw error;
  }
};

/**
 * Process speech input from customer
 */
const processSpeechInput = async (callSid, speechResult, confidence) => {
  try {
    const callSession = activeCalls.get(callSid);
    if (!callSession) {
      throw new Error('Call session not found');
    }

    logger.info(`Processing speech: ${speechResult} (confidence: ${confidence})`);

    // Store customer interaction
    await storeInteraction(callSession.callId, 'customer', speechResult, confidence);

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
    await storeInteraction(
      callSession.callId, 
      'ai', 
      aiResponse.response, 
      aiResponse.confidence,
      aiResponse.intent,
      calculateSentiment(aiResponse.response)
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
        sentiment: calculateSentiment(aiResponse.response)
      });
    }

    // Check if escalation is needed
    if (aiResponse.shouldEscalate) {
      return await handleEscalation(callSid, aiResponse.response);
    }

    // Generate TwiML response with AI-generated speech
    return await generateResponseTwiML(callSid, aiResponse.response, {
      action: '/api/voice/process-speech',
      confidence: aiResponse.confidence
    });

  } catch (error) {
    logger.error(`Error processing speech input: ${error.message}`);
    return generateErrorResponse();
  }
};

/**
 * Generate TwiML response with AI-generated speech
 */
const generateResponseTwiML = async (callSid, message, options = {}) => {
  try {
    // Get voice settings for the organization
    const voiceSettings = await getVoiceSettings(callSid);
    
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
    const audioUrl = await storeAudioFile(callSid, audioResult.audioBuffer);

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
};

/**
 * Handle call escalation to human agent
 */
const handleEscalation = async (callSid, message) => {
  try {
    const callSession = activeCalls.get(callSid);
    
    // Update call status to escalated (MySQL syntax)
    await db.query(
      'UPDATE calls SET status = ? WHERE call_sid = ?',
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
    
    return await generateResponseTwiML(callSid, escalationMessage, {
      action: '/api/voice/hold-music',
      hangup: false
    });

  } catch (error) {
    logger.error(`Error handling escalation: ${error.message}`);
    return generateErrorResponse();
  }
};

/**
 * End call and cleanup
 */
const endCall = async (callSid, reason = 'completed') => {
  try {
    const callSession = activeCalls.get(callSid);
    if (!callSession) {
      return;
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - callSession.startTime) / 1000);

    // Update call in database (MySQL syntax)
    await db.query(
      `UPDATE calls SET status = ?, end_time = ?, duration = ? 
       WHERE call_sid = ?`,
      [reason, endTime, duration, callSid]
    );

    // Calculate analytics
    const analytics = calculateCallAnalytics(callSession);
    
    // Store analytics (MySQL syntax)
    await db.query(
      `INSERT INTO call_analytics 
       (call_id, total_interactions, avg_confidence, sentiment_score, resolution_status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        callSession.callId,
        analytics.totalInteractions,
        analytics.avgConfidence,
        analytics.sentimentScore,
        analytics.resolutionStatus
      ]
    );

    // Emit final update
    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.emit('call-ended', {
        id: callSession.callId,
        duration,
        reason,
        analytics
      });
    }

    // Remove from active calls
    activeCalls.delete(callSid);
    processingQueue.delete(callSid);

    logger.info(`Call ended: ${callSid} (${duration}s, ${reason})`);

  } catch (error) {
    logger.error(`Error ending call: ${error.message}`);
  }
};

/**
 * Store interaction in database
 */
const storeInteraction = async (callId, speaker, content, confidence, intent = null, sentiment = null) => {
  try {
    await db.query(
      `INSERT INTO interactions 
       (call_id, speaker, content, confidence, intent, sentiment, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [callId, speaker, content, confidence, intent, sentiment]
    );
  } catch (error) {
    logger.error(`Error storing interaction: ${error.message}`);
  }
};

/**
 * Get voice settings for organization
 */
const getVoiceSettings = async (callSid) => {
  try {
    // Get organization from call
    const result = await db.query(
      'SELECT o.voice_settings FROM calls c JOIN organizations o ON c.organization_id = o.id WHERE c.call_sid = ?',
      [callSid]
    );
    
    if (result.length > 0 && result[0].voice_settings) {
      return JSON.parse(result[0].voice_settings);
    }
    
    // Default voice settings
    return {
      voiceId: 'default',
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: true
    };
  } catch (error) {
    logger.error(`Error getting voice settings: ${error.message}`);
    return {
      voiceId: 'default',
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: true
    };
  }
};

/**
 * Store audio file and return URL
 */
const storeAudioFile = async (callSid, audioBuffer) => {
  try {
    // Implementation for storing audio file (e.g., AWS S3, local storage)
    const filename = `${callSid}_${Date.now()}.mp3`;
    const audioUrl = `${process.env.BASE_URL}/audio/${filename}`;
    // Store audioBuffer to file system or cloud storage
    return audioUrl;
  } catch (error) {
    logger.error(`Error storing audio file: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate sentiment score
 */
const calculateSentiment = (text) => {
  // Simple sentiment analysis - in production, use a proper sentiment analysis service
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thank', 'thanks'];
  const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'disappointed', 'problem'];
  
  const words = text.toLowerCase().split(' ');
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / words.length));
};

/**
 * Calculate overall sentiment from interactions
 */
const calculateOverallSentiment = (interactions) => {
  const customerInteractions = interactions.filter(i => i.speaker === 'customer');
  if (customerInteractions.length === 0) return 0;
  
  const totalSentiment = customerInteractions.reduce((sum, interaction) => {
    return sum + calculateSentiment(interaction.content);
  }, 0);
  
  return totalSentiment / customerInteractions.length;
};

/**
 * Generate error response TwiML
 */
const generateErrorResponse = () => {
  return twilioService.generateTwiML(
    "I'm sorry, I'm experiencing technical difficulties. Please try calling back in a few minutes.",
    { hangup: true }
  );
};

/**
 * Calculate call analytics
 */
const calculateCallAnalytics = (callSession) => {
  const interactions = callSession.conversationHistory;
  const customerInteractions = interactions.filter(i => i.speaker === 'customer');
  const aiInteractions = interactions.filter(i => i.speaker === 'ai');

  const avgConfidence = aiInteractions.length > 0 
    ? aiInteractions.reduce((sum, i) => sum + (i.confidence || 0), 0) / aiInteractions.length
    : 0;

  const sentimentScore = calculateOverallSentiment(interactions);
  const resolutionStatus = callSession.currentContext?.shouldEscalate ? 'escalated' : 'resolved';

  return {
    totalInteractions: interactions.length,
    customerInteractions: customerInteractions.length,
    aiInteractions: aiInteractions.length,
    avgConfidence,
    sentimentScore,
    resolutionStatus
  };
};

/**
 * Get active calls count
 */
const getActiveCallsCount = () => {
  return activeCalls.size;
};

/**
 * Get active calls list
 */
const getActiveCalls = () => {
  return Array.from(activeCalls.entries()).map(([callSid, session]) => ({
    callSid,
    customerPhone: session.customerPhone,
    duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
    status: 'active',
    confidence: session.currentContext.confidence || 0,
    intent: session.currentContext.lastIntent || 'general'
  }));
};

// Module exports
module.exports = {
  setSocketIO,
  getSocketIO,
  handleIncomingCall,
  processSpeechInput,
  generateResponseTwiML,
  handleEscalation,
  endCall,
  storeInteraction,
  getVoiceSettings,
  storeAudioFile,
  calculateSentiment,
  calculateOverallSentiment,
  calculateCallAnalytics,
  generateErrorResponse,
  getActiveCallsCount,
  getActiveCalls
};
