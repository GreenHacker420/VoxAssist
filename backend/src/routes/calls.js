const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { prisma } = require('../database/prisma');

// Check if real services are available, otherwise use mocks
let twilioService;
let geminiService;
let elevenlabsService;

// Service selection with fallback to mocks
try {
  // Use real Twilio service if credentials are present (allow localhost for testing)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    twilioService = require('../services/twilioService');
    logger.info('Using real Twilio service with credentials');
  } else {
    throw new Error('Twilio credentials not found');
  }
} catch (error) {
  logger.warn('Real Twilio service not available, using mock service');
  twilioService = require('../services/mockTwilioService');
}

// Gemini service selection
if (process.env.GEMINI_API_KEY) {
  try {
    geminiService = require('../services/geminiService');
    logger.info('Using real Gemini service');
  } catch (error) {
    logger.warn('Gemini service unavailable, using mock responses');
    geminiService = {
      processCustomerQuery: async (query, context) => ({
        response: `Thank you for your inquiry: "${query}". This is a mock AI response for testing purposes.`,
        intent: 'general_inquiry',
        confidence: 0.85,
        shouldEscalate: false
      })
    };
  }
} else {
  logger.warn('Gemini API key not found, using mock responses');
  geminiService = {
    processCustomerQuery: async (query, context) => ({
      response: `Thank you for your inquiry: "${query}". This is a mock AI response for testing purposes.`,
      intent: 'general_inquiry',
      confidence: 0.85,
      shouldEscalate: false
    })
  };
}

// ElevenLabs service selection
if (process.env.ELEVENLABS_API_KEY) {
  try {
    elevenlabsService = require('../services/elevenlabsService');
    logger.info('Using real ElevenLabs service');
  } catch (error) {
    logger.warn('ElevenLabs service unavailable, using mock audio');
    elevenlabsService = {
      textToSpeech: async (text) => ({
        size: 1024,
        audioData: Buffer.from('mock-audio-data'),
        contentType: 'audio/mpeg'
      })
    };
  }
} else {
  logger.warn('ElevenLabs API key not found, using mock audio');
  elevenlabsService = {
    textToSpeech: async (text) => ({
      size: 1024,
      audioData: Buffer.from('mock-audio-data'),
      contentType: 'audio/mpeg'
    })
  };
}

// Get all calls
router.get('/', authenticateToken, async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      where: {
        userId: req.user.userId
      },
      orderBy: {
        startTime: 'desc'
      },
      select: {
        id: true,
        customerPhone: true,
        twilioPhone: true,
        status: true,
        duration: true,
        startTime: true,
        endTime: true,
        callSid: true,
        metadata: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Transform data to match frontend expectations
    const transformedCalls = calls.map(call => ({
      id: call.id,
      customerPhone: call.customerPhone,
      customerName: call.metadata?.customerName || null,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      callSid: call.callSid,
      sentiment: call.metadata?.sentiment || null,
      escalated: call.status === 'escalated',
      user: call.user
    }));

    res.json({ success: true, data: transformedCalls });
  } catch (error) {
    logger.error(`Error fetching calls: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch calls' });
  }
});

// Get specific call details with AI insights
router.get('/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.call.findFirst({
      where: {
        id: parseInt(callId),
        userId: req.user.userId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }
    
    // Get call transcript and AI insights
    const transcript = call.metadata?.transcript || [];
    const aiInsights = {
      sentiment: call.metadata?.sentiment || 'neutral',
      confidence: call.metadata?.sentimentConfidence || 0,
      keyTopics: call.metadata?.keyTopics || [],
      escalationReasons: call.metadata?.escalationReasons || [],
      customerSatisfaction: call.metadata?.customerSatisfaction || null,
      aiResponseQuality: call.metadata?.aiResponseQuality || null
    };
    
    res.json({ 
      success: true, 
      data: {
        ...call,
        transcript,
        aiInsights
      }
    });
  } catch (error) {
    logger.error(`Error fetching call details: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch call details' });
  }
});

// Update call sentiment and AI insights
router.post('/:callId/sentiment', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { sentiment, confidence, keyTopics, escalationReasons } = req.body;
    
    const call = await prisma.call.findFirst({
      where: {
        id: parseInt(callId),
        userId: req.user.userId
      }
    });
    
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }
    
    const updatedCall = await prisma.call.update({
      where: { id: parseInt(callId) },
      data: {
        metadata: {
          ...call.metadata,
          sentiment,
          sentimentConfidence: confidence,
          keyTopics: keyTopics || [],
          escalationReasons: escalationReasons || [],
          lastAnalyzed: new Date().toISOString()
        }
      }
    });
    
    res.json({ success: true, data: updatedCall });
  } catch (error) {
    logger.error(`Error updating call sentiment: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update sentiment' });
  }
});

// Store call transcript
router.post('/:callId/transcript', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { transcript, aiResponses } = req.body;
    
    const call = await prisma.call.findFirst({
      where: {
        id: parseInt(callId),
        userId: req.user.userId
      }
    });
    
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }
    
    const updatedCall = await prisma.call.update({
      where: { id: parseInt(callId) },
      data: {
        metadata: {
          ...call.metadata,
          transcript: transcript || [],
          aiResponses: aiResponses || [],
          transcriptUpdated: new Date().toISOString()
        }
      }
    });
    
    res.json({ success: true, data: updatedCall });
  } catch (error) {
    logger.error(`Error storing transcript: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to store transcript' });
  }
});

// Initiate a new call
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, callbackUrl } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    // Always pass callbackUrl to maintain consistent interface
    // Mock service will ignore invalid URLs, real service needs valid HTTPS URLs
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const webhookUrl = callbackUrl || `${baseUrl}/api/webhooks/twilio/voice`;
    
    const twilioCall = await twilioService.initiateCall(phoneNumber, webhookUrl);
    
    // Save call to database
    const call = await prisma.call.create({
      data: {
        userId: req.user.userId,
        customerPhone: phoneNumber,
        twilioPhone: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        status: 'initiated',
        callSid: twilioCall.callSid,
        startTime: new Date(),
        metadata: {
          twilioStatus: twilioCall.status,
          direction: 'outbound'
        }
      }
    });
    
    res.json({ 
      success: true, 
      data: {
        id: call.id,
        customerPhone: call.customerPhone,
        status: call.status,
        startTime: call.startTime,
        callSid: call.callSid
      }
    });
  } catch (error) {
    logger.error(`Error initiating call: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to initiate call' });
  }
});

// End a call
router.post('/:callId/end', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    
    // End call with Twilio
    await twilioService.endCall(callId);
    
    // Update call status in database
    const updatedCall = await prisma.call.update({
      where: { id: parseInt(callId) },
      data: {
        status: 'completed',
        endTime: new Date(),
        metadata: {
          ...await prisma.call.findUnique({ where: { id: parseInt(callId) } }).then(call => call.metadata || {}),
          endedBy: 'agent',
          endReason: 'manual'
        }
      }
    });
    
    // Calculate and update duration
    const duration = Math.floor((updatedCall.endTime - updatedCall.startTime) / 1000);
    await prisma.call.update({
      where: { id: parseInt(callId) },
      data: { duration }
    });
    
    res.json({ success: true, message: 'Call ended successfully', data: updatedCall });
  } catch (error) {
    logger.error(`Error ending call: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to end call' });
  }
});

// Process AI response for a call
router.post('/:callId/ai-response', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // Get AI response from Gemini
    const aiResponse = await geminiService.processCustomerQuery(query, context);
    
    // Generate speech from AI response
    const speechData = await elevenlabsService.textToSpeech(aiResponse.response);
    
    // Save interaction to database
    const call = await prisma.call.findUnique({ where: { id: parseInt(callId) } });
    const existingTranscript = call?.metadata?.transcript || [];
    const existingAiResponses = call?.metadata?.aiResponses || [];
    
    await prisma.call.update({
      where: { id: parseInt(callId) },
      data: {
        metadata: {
          ...call.metadata,
          transcript: [...existingTranscript, {
            timestamp: new Date().toISOString(),
            speaker: 'customer',
            text: query,
            type: 'query'
          }],
          aiResponses: [...existingAiResponses, {
            timestamp: new Date().toISOString(),
            query,
            response: aiResponse.response,
            intent: aiResponse.intent,
            confidence: aiResponse.confidence,
            shouldEscalate: aiResponse.shouldEscalate
          }]
        }
      }
    });
    
    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    io.to(`call-${callId}`).emit('ai-response', {
      query,
      response: aiResponse.response,
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      shouldEscalate: aiResponse.shouldEscalate
    });
    
    res.json({ 
      success: true, 
      data: {
        ...aiResponse,
        audioSize: speechData.size
      }
    });
  } catch (error) {
    logger.error(`Error processing AI response: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to process AI response' });
  }
});

// Get call transcript
router.get('/:callId/transcript', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    
    // Fetch transcript from database
    const call = await prisma.call.findFirst({
      where: {
        id: parseInt(callId),
        userId: req.user.userId
      }
    });
    
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }
    
    const transcript = call.metadata?.transcript || [];
    const aiResponses = call.metadata?.aiResponses || [];
    
    res.json({ 
      success: true, 
      data: {
        transcript,
        aiResponses,
        callId: call.id,
        duration: call.duration,
        status: call.status
      }
    });
  } catch (error) {
    logger.error(`Error fetching transcript: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch transcript' });
  }
});

// Update call sentiment
router.post('/:callId/sentiment', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { sentiment, score } = req.body;
    
    // Update sentiment in database
    const call = await prisma.call.findFirst({
      where: {
        id: parseInt(callId),
        userId: req.user.userId
      }
    });
    
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }
    
    const updatedCall = await prisma.call.update({
      where: { id: parseInt(callId) },
      data: {
        metadata: {
          ...call.metadata,
          sentiment,
          sentimentScore: score,
          sentimentUpdated: new Date().toISOString()
        }
      }
    });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`call-${callId}`).emit('sentiment-update', { sentiment, score });
    
    res.json({ success: true, message: 'Sentiment updated' });
  } catch (error) {
    logger.error(`Error updating sentiment: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update sentiment' });
  }
});

module.exports = router;
