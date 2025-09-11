const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Demo call storage (in-memory for simplicity)
const demoCalls = new Map();
const logger = require('../utils/logger');
const { prisma } = require('../database/prisma');

// Import services
const dynamicProviderService = require('../services/dynamicProviderService');
let geminiService;
let elevenlabsService;

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
        userId: userId,
        metadata: {
          enableAdvancedAnalysis: enableAdvancedAnalysis || false,
          initiatedBy: userId,
          initiatedAt: new Date().toISOString()
        }
      }
    });

    try {
      // Get user's configured provider service
      const providerService = await dynamicProviderService.getProviderService(userId, 'phone');

      // Initiate call using the configured provider
      const providerCall = await providerService.initiateCall(
        phoneNumber,
        {
          callbackUrl: callbackUrl || `${process.env.BASE_URL}/api/webhooks/${providerService.provider}/voice`,
          enableAdvancedAnalysis: enableAdvancedAnalysis || false
        }
      );

      // Update call with provider SID and status
      const updatedCall = await prisma.call.update({
        where: { id: call.id },
        data: {
          callSid: providerCall.callSid,
          status: providerCall.status === 'initiated' ? 'active' : providerCall.status,
          metadata: {
            ...call.metadata,
            provider: providerService.provider,
            providerCallId: providerCall.callSid
          }
        }
      });

      logger.info(`Call initiated successfully using ${providerService.provider}: ${updatedCall.id}`);

      res.json({
        success: true,
        data: updatedCall
      });
    } catch (providerError) {
      // Handle provider errors (like unverified numbers in trial accounts)
      if (providerError.message.includes('unverified') || providerError.message.includes('Trial')) {
        logger.warn(`Provider trial limitation for ${phoneNumber}, creating mock call instead`);
        
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

// Update call sentiment (consolidated and improved)
router.post('/:callId/sentiment', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { sentiment, confidence, score, keyTopics, escalationReasons } = req.body;

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
          sentimentScore: score || confidence,
          sentimentConfidence: confidence,
          keyTopics: keyTopics || [],
          escalationReasons: escalationReasons || [],
          lastAnalyzed: new Date().toISOString(),
          sentimentUpdated: new Date().toISOString()
        }
      }
    });

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`call-${callId}`).emit('sentiment-update', {
        sentiment,
        score: score || confidence,
        confidence,
        keyTopics,
        escalationReasons
      });
    }

    // Also broadcast via WebSocket for compatibility
    const wsClients = global.wsClients || new Map();
    const callClients = wsClients.get(parseInt(callId)) || [];
    callClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'sentiment_update',
          sentiment: { overall: sentiment, score: score || confidence, confidence }
        }));
      }
    });

    res.json({ success: true, data: updatedCall });
  } catch (error) {
    logger.error(`Error updating sentiment: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update sentiment' });
  }
});

// Get single call (fixed duplicate route and improved data transformation)
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

    // Transform data to match frontend expectations
    const transformedCall = {
      id: call.id.toString(),
      customerName: call.metadata?.customerName || null,
      customerEmail: call.metadata?.customerEmail || null,
      customerPhone: call.customerPhone,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      callSid: call.callSid,
      sentiment: call.metadata?.sentiment || null,
      sentimentScore: call.metadata?.sentimentScore || null,
      escalated: call.status === 'escalated',
      transcript: call.metadata?.transcript || [],
      aiInsights: call.metadata?.aiInsights || null,
      user: call.user
    };

    res.json({ success: true, data: transformedCall });
  } catch (error) {
    logger.error('Error fetching call:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch call' });
  }
});

// End call
router.post('/:callId/end', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const callIdInt = parseInt(callId);

    const call = await prisma.call.findFirst({
      where: {
        id: callIdInt,
        userId: req.user.userId
      }
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    if (call.status !== 'active' && call.status !== 'ringing') {
      return res.status(400).json({ success: false, error: 'Call is not active or ringing' });
    }

    // End call with configured provider
    if (call.callSid && !call.callSid.startsWith('mock-')) {
      try {
        const providerService = await dynamicProviderService.getProviderService(req.user.userId, 'phone');
        await providerService.endCall(call.callSid);
        logger.info(`Call ${call.callSid} ended using ${providerService.provider}`);
      } catch (providerError) {
        logger.warn(`Failed to end provider call ${call.callSid}: ${providerError.message}`);
      }
    }

    // Update call in database
    const updatedCall = await prisma.call.update({
      where: { id: callIdInt },
      data: {
        status: 'completed',
        endTime: new Date(),
        duration: Math.floor((new Date() - new Date(call.startTime)) / 1000)
      }
    });

        // Send post-call survey SMS
    if (updatedCall.customerPhone) {
      const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/survey/${call.id}`;
      const message = `Thank you for calling VoxAssist. Please take a moment to rate your experience: ${surveyUrl}`;
      try {
        await twilioService.sendSms(updatedCall.customerPhone, message);
        logger.info(`Survey SMS sent to ${updatedCall.customerPhone}`);
      } catch (smsError) {
        logger.error(`Failed to send survey SMS to ${updatedCall.customerPhone}: ${smsError.message}`);
      }
    }

    // Broadcast call status update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`call-${callId}`).emit('call-ended', {
        call: updatedCall,
        endTime: updatedCall.endTime,
        duration: updatedCall.duration
      });
    }

    // Broadcast call status update via WebSocket for compatibility
    const wsClients = global.wsClients || new Map();
    const callClients = wsClients.get(callIdInt) || [];
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
    const callIdInt = parseInt(callId);

    const call = await prisma.call.findFirst({
      where: {
        id: callIdInt,
        userId: req.user.userId
      }
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    if (call.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Call is not active' });
    }

    // Update call status and metadata to indicate human handoff
    const updatedCall = await prisma.call.update({
      where: { id: callIdInt },
      data: {
        status: 'escalated',
        metadata: {
          ...call.metadata,
          handedOffToHuman: true,
          handoffTime: new Date().toISOString(),
          agentId: req.user.userId,
          escalationReason: 'Manual handoff requested'
        }
      }
    });

    // Broadcast handoff event via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`call-${callId}`).emit('call-handoff', {
        call: updatedCall,
        agentId: req.user.userId,
        handoffTime: updatedCall.metadata.handoffTime
      });
    }

    // Broadcast handoff event via WebSocket for compatibility
    const wsClients = global.wsClients || new Map();
    const callClients = wsClients.get(callIdInt) || [];
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

// Demo call endpoints
router.post('/demo/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const demoCall = {
      id: `demo-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      customerName: 'Demo Customer',
      customerEmail: 'demo@example.com',
      customerPhone: '+1-555-DEMO',
      status: 'active',
      startTime: new Date().toISOString(),
      sentiment: 'neutral',
      sentimentScore: 0.5,
      callSid: `demo-sid-${Date.now()}`,
      transcript: '',
      aiInsights: 'Demo call in progress'
    };

    demoCalls.set(demoCall.id, demoCall);

    res.json({
      success: true,
      data: demoCall
    });
  } catch (error) {
    console.error('Error starting demo call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start demo call',
      details: error.message
    });
  }
});

router.post('/demo/:callId/end', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to end this demo call'
      });
    }

    demoCall.status = 'completed';
    demoCall.endTime = new Date().toISOString();
    demoCall.duration = Math.floor((new Date() - new Date(demoCall.startTime)) / 1000);

    demoCalls.set(callId, demoCall);

    res.json({
      success: true,
      data: demoCall
    });
  } catch (error) {
    console.error('Error ending demo call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end demo call',
      details: error.message
    });
  }
});

router.post('/demo/:callId/voice', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    let analysis = {};
    try {
      analysis = JSON.parse(req.body.analysis || '{}');
    } catch (e) {
      analysis = {};
    }

    const mockTranscript = generateMockTranscript(analysis);
    const mockSentiment = generateMockSentiment(analysis);
    const mockAiResponse = generateMockAiResponse(mockTranscript);

    demoCall.transcript += `Customer: ${mockTranscript}\n`;
    demoCall.sentiment = mockSentiment.overall;
    demoCall.sentimentScore = mockSentiment.score;

    demoCalls.set(callId, demoCall);

    res.json({
      success: true,
      data: {
        transcript: mockTranscript,
        confidence: analysis.confidence || 0.8,
        sentiment: mockSentiment.overall,
        sentimentData: mockSentiment,
        aiResponse: mockAiResponse
      }
    });
  } catch (error) {
    console.error('Error processing voice input:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice input',
      details: error.message
    });
  }
});

// Helper functions
function generateMockTranscript(analysis) {
  const mockPhrases = [
    "Hello, I need help with my account",
    "Can you help me with billing questions?",
    "I'm having trouble with my order",
    "What are your business hours?",
    "I'd like to speak to a manager",
    "Thank you for your help"
  ];

  let selectedPhrases = mockPhrases;
  if (analysis.emotion === 'angry') {
    selectedPhrases = ["I'm very frustrated with this service", "This is completely unacceptable"];
  } else if (analysis.emotion === 'happy') {
    selectedPhrases = ["Thank you so much for your help", "This is exactly what I needed"];
  }

  return selectedPhrases[Math.floor(Math.random() * selectedPhrases.length)];
}

function generateMockSentiment(analysis) {
  let overall = 'neutral';
  let score = 0.5;

  switch (analysis.emotion) {
    case 'happy':
    case 'excited':
      overall = 'positive';
      score = 0.7 + Math.random() * 0.3;
      break;
    case 'angry':
    case 'sad':
      overall = 'negative';
      score = Math.random() * 0.4;
      break;
    default:
      overall = 'neutral';
      score = 0.4 + Math.random() * 0.2;
  }

  return {
    overall,
    score,
    emotions: {
      joy: analysis.emotion === 'happy' ? 0.8 : 0.2,
      anger: analysis.emotion === 'angry' ? 0.8 : 0.1,
      fear: analysis.emotion === 'sad' ? 0.6 : 0.1,
      sadness: analysis.emotion === 'sad' ? 0.7 : 0.1,
      surprise: analysis.emotion === 'excited' ? 0.7 : 0.1
    }
  };
}

function generateMockAiResponse(transcript) {
  const responses = {
    'account': "I'd be happy to help you with your account.",
    'billing': "I can assist you with billing questions.",
    'order': "Let me check on your order status.",
    'hours': "Our business hours are Monday through Friday, 9 AM to 6 PM EST.",
    'manager': "Let me connect you with a manager right away.",
    'help': "How can I assist you today?"
  };

  const lowerTranscript = transcript.toLowerCase();
  for (const [keyword, response] of Object.entries(responses)) {
    if (lowerTranscript.includes(keyword)) {
      return response;
    }
  }

  return "I understand. Let me help you with that.";
}

module.exports = router;
