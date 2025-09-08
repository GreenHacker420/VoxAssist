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
    const { phoneNumber, callbackUrl, enableAdvancedAnalysis } = req.body;
    const userId = req.user.userId;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    logger.info(`Initiating call to ${phoneNumber} for user ${userId}`);

    // Create call record first
    const call = await prisma.call.create({
      data: {
        customerPhone: phoneNumber,
        status: 'initiated',
        startTime: new Date(),
        organizationId: req.user.organizationId || 1,
        crmSynced: false,
        metadata: {
          enableAdvancedAnalysis: enableAdvancedAnalysis || false,
          initiatedBy: userId,
          initiatedAt: new Date().toISOString()
        }
      }
    });

    try {
      // Try to initiate Twilio call
      const twilioCall = await twilioService.initiateCall(
        phoneNumber,
        callbackUrl || `${process.env.BASE_URL}/api/webhooks/twilio/voice`
      );

      // Update call with Twilio SID
      const updatedCall = await prisma.call.update({
        where: { id: call.id },
        data: {
          callSid: twilioCall.sid,
          status: 'active'
        }
      });

      logger.info(`Call initiated successfully: ${updatedCall.id}`);

      res.json({
        success: true,
        data: updatedCall
      });
    } catch (twilioError) {
      // Handle Twilio errors (like unverified numbers in trial accounts)
      if (twilioError.message.includes('unverified') || twilioError.message.includes('Trial')) {
        logger.warn(`Twilio trial limitation for ${phoneNumber}, creating mock call instead`);
        
        // Create a mock call for demo purposes
        const mockCall = await prisma.call.update({
          where: { id: call.id },
          data: {
            callSid: `mock-${Date.now()}`,
            status: 'active',
            customerName: 'Demo Customer',
            customerEmail: 'demo@example.com',
            metadata: {
              ...call.metadata,
              isMockCall: true,
              mockReason: 'Twilio trial account limitation'
            }
          }
        });

        logger.info(`Mock call created successfully: ${mockCall.id}`);

        res.json({
          success: true,
          data: mockCall,
          message: 'Demo call initiated (Twilio trial account)'
        });
      } else {
        throw twilioError;
      }
    }
  } catch (error) {
    logger.error('Error initiating call:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call'
    });
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

// Get single call
router.get('/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.call.findUnique({
      where: {
        id: callId,
        userId: req.user.userId
      }
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    res.json({ success: true, data: call });
  } catch (error) {
    logger.error('Error fetching call:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch call' });
  }
});

// End call
router.post('/:callId/end', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.call.findUnique({
      where: {
        id: callId,
        userId: req.user.userId
      }
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    if (call.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Call is not active' });
    }

    // End call with Twilio
    if (call.callSid && !call.callSid.startsWith('mock-')) {
      await twilioService.endCall(call.callSid);
    }

    // Update call in database
    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endTime: new Date(),
        duration: Math.floor((new Date() - new Date(call.startTime)) / 1000)
      }
    });

    // Broadcast call status update via WebSocket
    const wsClients = global.wsClients || new Map();
    const callClients = wsClients.get(callId) || [];
    callClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'call_status_update',
          status: 'completed',
          call: updatedCall
        }));
      }
    });

    res.json({ success: true, data: updatedCall });
  } catch (error) {
    logger.error('Error ending call:', error);
    res.status(500).json({ success: false, error: 'Failed to end call' });
  }
});

// Handoff to human
router.post('/:callId/handoff', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.call.findUnique({
      where: {
        id: callId,
        userId: req.user.userId
      }
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    if (call.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Call is not active' });
    }

    // Update call metadata to indicate human handoff
    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        metadata: {
          ...call.metadata,
          handedOffToHuman: true,
          handoffTime: new Date().toISOString(),
          agentId: req.user.userId
        }
      }
    });

    // Broadcast handoff event via WebSocket
    const wsClients = global.wsClients || new Map();
    const callClients = wsClients.get(callId) || [];
    callClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'handoff_completed',
          call: updatedCall,
          agentId: req.user.userId
        }));
      }
    });

    res.json({ success: true, data: updatedCall });
  } catch (error) {
    logger.error('Error handing off call:', error);
    res.status(500).json({ success: false, error: 'Failed to handoff call' });
  }
});

module.exports = router;
