const express = require('express');
const multer = require('multer');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { authenticateTokenOrDemo, isDemoRequest } = require('../middleware/demoAuth');
const emotionDetection = require('../services/emotionDetection');
const geminiService = require('../services/geminiService');

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// In-memory storage for demo calls (in production, use Redis or database)
const demoCallSessions = new Map();

// Demo conversation templates
const DEMO_CONVERSATION_TEMPLATES = {
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

// POST /api/demo-calls - Initiate a new demo call
router.post('/', authenticateTokenOrDemo, async (req, res) => {
  try {
    const { template = 'CUSTOMER_SUPPORT', userId } = req.body;
    const callId = `demo-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const demoCall = {
      id: callId,
      userId: req.user.userId,
      template,
      status: 'active',
      startTime: new Date().toISOString(),
      currentMessageIndex: 0,
      transcript: [],
      overallSentiment: {
        overall: 'neutral',
        score: 0.5,
        emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
      },
      metadata: {
        customerName: 'Demo Customer',
        customerPhone: '+1-555-DEMO',
        customerEmail: 'demo.customer@example.com'
      }
    };

    // Store demo call session
    demoCallSessions.set(callId, demoCall);

    // Start conversation simulation
    const demoCallService = require('../services/demoCallService');
    await demoCallService.startDemoCall(callId, req.user.userId, template);

    logger.info(`Demo call initiated: ${callId} for user ${req.user.userId}`);

    res.json({
      success: true,
      data: {
        id: callId,
        status: 'active',
        startTime: demoCall.startTime,
        customerName: demoCall.metadata.customerName,
        customerPhone: demoCall.metadata.customerPhone,
        sentiment: 'neutral',
        sentimentScore: 0.5,
        // Include call type for frontend identification
        callType: 'demo',
        duration: 0
      }
    });

  } catch (error) {
    logger.error(`Error initiating demo call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate demo call'
    });
  }
});

// GET /api/demo-calls/:callId - Get demo call details
router.get('/:callId', authenticateTokenOrDemo, async (req, res) => {
  try {
    const { callId } = req.params;
    const demoCall = demoCallSessions.get(callId);

    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    // Check if user has access to this demo call
    if (demoCall.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        id: demoCall.id,
        status: demoCall.status,
        startTime: demoCall.startTime,
        endTime: demoCall.endTime,
        transcript: demoCall.transcript,
        sentiment: demoCall.overallSentiment.overall,
        sentimentScore: demoCall.overallSentiment.score,
        emotions: demoCall.overallSentiment.emotions,
        customerName: demoCall.metadata.customerName,
        customerPhone: demoCall.metadata.customerPhone,
        aiInsights: demoCall.aiInsights || 'Demo call in progress'
      }
    });

  } catch (error) {
    logger.error(`Error fetching demo call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch demo call'
    });
  }
});

// POST /api/demo-calls/:callId/next-message - Get next message in demo conversation
router.post('/:callId/next-message', authenticateTokenOrDemo, async (req, res) => {
  try {
    const { callId } = req.params;
    const demoCall = demoCallSessions.get(callId);

    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (demoCall.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Demo call is not active'
      });
    }

    const template = DEMO_CONVERSATION_TEMPLATES[demoCall.template];
    if (!template || demoCall.currentMessageIndex >= template.length) {
      // End of conversation
      demoCall.status = 'completed';
      demoCall.endTime = new Date().toISOString();
      
      return res.json({
        success: true,
        data: {
          finished: true,
          status: 'completed'
        }
      });
    }

    const nextMessage = template[demoCall.currentMessageIndex];
    const transcriptEntry = {
      id: `msg-${Date.now()}-${demoCall.currentMessageIndex}`,
      speaker: nextMessage.speaker,
      text: nextMessage.text,
      timestamp: new Date().toISOString(),
      confidence: 0.85 + Math.random() * 0.1,
      sentiment: nextMessage.sentiment,
      sentimentScore: nextMessage.sentimentScore,
      emotions: nextMessage.emotions
    };

    // Add to transcript
    demoCall.transcript.push(transcriptEntry);
    demoCall.currentMessageIndex++;

    // Update overall sentiment (weighted average)
    const totalMessages = demoCall.transcript.length;
    const currentWeight = 1 / totalMessages;
    const previousWeight = (totalMessages - 1) / totalMessages;
    
    demoCall.overallSentiment.score = 
      (demoCall.overallSentiment.score * previousWeight) + 
      (nextMessage.sentimentScore * currentWeight);

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
        (nextMessage.emotions[emotion] * currentWeight);
    });

    logger.info(`Demo call ${callId} - Next message: ${nextMessage.speaker}`);

    res.json({
      success: true,
      data: {
        message: transcriptEntry,
        overallSentiment: demoCall.overallSentiment,
        finished: false
      }
    });

  } catch (error) {
    logger.error(`Error getting next demo message: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get next message'
    });
  }
});

// DELETE /api/demo-calls/:callId - End demo call
router.delete('/:callId', authenticateTokenOrDemo, async (req, res) => {
  try {
    const { callId } = req.params;
    const demoCall = demoCallSessions.get(callId);

    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // End the demo call
    demoCall.status = 'completed';
    demoCall.endTime = new Date().toISOString();
    
    // Calculate final insights
    demoCall.aiInsights = `Demo call completed. Total messages: ${demoCall.transcript.length}. Overall sentiment: ${demoCall.overallSentiment.overall} (${Math.round(demoCall.overallSentiment.score * 100)}%)`;

    logger.info(`Demo call ended: ${callId}`);

    res.json({
      success: true,
      data: {
        id: callId,
        status: 'completed',
        endTime: demoCall.endTime,
        aiInsights: demoCall.aiInsights
      }
    });

  } catch (error) {
    logger.error(`Error ending demo call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to end demo call'
    });
  }
});

// GET /api/demo-calls - Get all demo calls for user
router.get('/', authenticateTokenOrDemo, async (req, res) => {
  try {
    const userDemoCalls = Array.from(demoCallSessions.values())
      .filter(call => call.userId === req.user.userId)
      .map(call => ({
        id: call.id,
        status: call.status,
        startTime: call.startTime,
        endTime: call.endTime,
        customerName: call.metadata.customerName,
        customerPhone: call.metadata.customerPhone,
        sentiment: call.overallSentiment.overall,
        sentimentScore: call.overallSentiment.score,
        messageCount: call.transcript.length
      }));

    res.json({
      success: true,
      data: userDemoCalls
    });

  } catch (error) {
    logger.error(`Error fetching demo calls: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch demo calls'
    });
  }
});

// POST /api/demo-calls/:id/speech - Process customer speech input for real-time voice interaction
router.post('/:id/speech', upload.single('audioData'), authenticateTokenOrDemo, async (req, res) => {
  try {
    const { id: callId } = req.params;
    const { transcript, isInterim = 'false' } = req.body;
    const audioFile = req.file;

    // Convert string to boolean
    const isInterimBool = isInterim === 'true' || isInterim === true;

    if (!callId || !transcript) {
      return res.status(400).json({
        success: false,
        error: 'Call ID and transcript are required'
      });
    }

    // Get demo call session
    const demoCall = demoCallSessions.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    // Verify user access
    if (demoCall.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    logger.info(`Processing speech for demo call: ${callId}, transcript: "${transcript}", interim: ${isInterimBool}, hasAudio: ${!!audioFile}`);

    // Process customer speech with AI
    const demoCallService = require('../services/demoCallService');
    const result = await demoCallService.processCustomerSpeech(callId, transcript, isInterimBool, audioFile);

    res.json({
      success: true,
      data: {
        callId,
        customerTranscript: transcript,
        aiResponse: result.aiResponse,
        audioUrl: result.audioUrl,
        sentiment: result.sentiment,
        isProcessing: result.isProcessing,
        transcriptId: result.transcriptId,
        isInterim: result.isInterim || false,
        hasAudioFile: !!audioFile
      }
    });

  } catch (error) {
    logger.error(`Error processing speech for demo call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to process speech input'
    });
  }
});

// POST /api/demo-calls/:id/enable-voice - Enable voice interaction mode
router.post('/:id/enable-voice', authenticateTokenOrDemo, async (req, res) => {
  try {
    const { id: callId } = req.params;

    // Get demo call session
    const demoCall = demoCallSessions.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    // Verify user access
    if (demoCall.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Enable voice interaction
    const demoCallService = require('../services/demoCallService');
    demoCallService.enableVoiceInteraction(callId);

    logger.info(`Voice interaction enabled for demo call: ${callId}`);

    res.json({
      success: true,
      data: {
        callId,
        voiceInteractionEnabled: true,
        message: 'Voice interaction enabled successfully'
      }
    });

  } catch (error) {
    logger.error(`Error enabling voice interaction for demo call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to enable voice interaction'
    });
  }
});

// POST /api/demo-calls/:id/disable-voice - Disable voice interaction mode
router.post('/:id/disable-voice', authenticateTokenOrDemo, async (req, res) => {
  try {
    const { id: callId } = req.params;

    // Get demo call session
    const demoCall = demoCallSessions.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    // Verify user access
    if (demoCall.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Disable voice interaction
    const demoCallService = require('../services/demoCallService');
    demoCallService.disableVoiceInteraction(callId);

    logger.info(`Voice interaction disabled for demo call: ${callId}`);

    res.json({
      success: true,
      data: {
        callId,
        voiceInteractionEnabled: false,
        message: 'Voice interaction disabled successfully'
      }
    });

  } catch (error) {
    logger.error(`Error disabling voice interaction for demo call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to disable voice interaction'
    });
  }
});

module.exports = router;
