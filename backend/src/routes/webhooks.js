const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Check if real services are available, otherwise use mocks
let twilioService, geminiService, elevenlabsService;

try {
  twilioService = require('../services/twilioService');
  geminiService = require('../services/geminiService');
  elevenlabsService = require('../services/elevenlabsService');
} catch (error) {
  logger.warn('Real services not available, using mocks');
  twilioService = require('../services/mockTwilioService');
  geminiService = {
    processCustomerQuery: async (query, context) => ({
      response: "Thank you for your inquiry. Let me help you with that.",
      confidence: 0.8,
      intent: "general_inquiry"
    })
  };
  elevenlabsService = {
    optimizeTextForSpeech: (text) => text,
    textToSpeech: async (text) => ({ audioUrl: 'mock-audio-url' })
  };
}

// Background job queue for transcription processing
async function queueTranscriptionJob(jobData) {
  try {
    // In a production environment, you would use a proper job queue like Bull, Agenda, or AWS SQS
    // For now, we'll process it immediately in the background
    
    logger.info(`Queuing transcription job for call ${jobData.callId}`);
    
    // Process asynchronously without blocking the webhook response
    setImmediate(async () => {
      try {
        await processRecordingTranscription(jobData);
      } catch (error) {
        logger.error(`Background transcription processing failed: ${error.message}`);
      }
    });
    
    return { success: true, jobId: `transcription-${jobData.callId}-${Date.now()}` };
  } catch (error) {
    logger.error(`Error queuing transcription job: ${error.message}`);
    throw error;
  }
}

// Process recording transcription and analysis
async function processRecordingTranscription(jobData) {
  const { callId, recordingUrl, recordingSid, callSid } = jobData;
  
  try {
    logger.info(`Processing transcription for call ${callId}`);
    
    // Step 1: Download and transcribe the recording
    // In production, you would use services like:
    // - Google Speech-to-Text
    // - AWS Transcribe
    // - Azure Speech Services
    // - AssemblyAI
    
    // Mock transcription for now
    const mockTranscript = [
      {
        timestamp: '00:00:05',
        speaker: 'customer',
        text: 'Hello, I need help with my account',
        confidence: 0.95
      },
      {
        timestamp: '00:00:08',
        speaker: 'ai',
        text: 'Hello! I\'d be happy to help you with your account. What specific issue are you experiencing?',
        confidence: 0.98
      }
    ];
    
    // Step 2: Analyze sentiment and extract insights
    const sentimentAnalysis = {
      overallSentiment: 'neutral',
      confidence: 0.85,
      keyTopics: ['account', 'help', 'support'],
      emotionalTone: 'professional'
    };
    
    // Step 3: Update call record with transcription and analysis
    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (call) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          metadata: {
            ...call.metadata,
            fullTranscript: mockTranscript,
            sentimentAnalysis,
            recordingProcessed: true,
            processedAt: new Date().toISOString(),
            transcriptionSource: 'automated'
          }
        }
      });
      
      logger.info(`Transcription processing completed for call ${callId}`);
    }
    
  } catch (error) {
    logger.error(`Error processing transcription for call ${callId}: ${error.message}`);
    
    // Mark as failed in database
    try {
      await prisma.call.update({
        where: { id: callId },
        data: {
          metadata: {
            ...await prisma.call.findUnique({ where: { id: callId } }).then(c => c.metadata || {}),
            recordingProcessed: false,
            processingError: error.message,
            processedAt: new Date().toISOString()
          }
        }
      });
    } catch (dbError) {
      logger.error(`Failed to update call with processing error: ${dbError.message}`);
    }
  }
}

// Webhook validation middleware for Twilio (must be before route definitions)
router.use(/^\/twilio\/.*/, (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  if (process.env.NODE_ENV === 'production') {
    const isValid = twilioService.validateWebhook(signature, url, req.body);
    if (!isValid) {
      logger.warn(`Invalid Twilio webhook signature for ${url}`);
      return res.status(403).send('Forbidden');
    }
  }
  
  next();
});

// Twilio webhook for incoming calls
router.post('/twilio/voice', async (req, res) => {
  try {
    const { CallSid, From, To, SpeechResult, Digits } = req.body;
    
    logger.info(`Incoming call webhook: ${CallSid} from ${From}`);
    
    // Initial greeting
    if (!SpeechResult && !Digits) {
      const twiml = twilioService.generateTwiML(
        "Hello! Welcome to VoxAssist. I'm your AI support agent. How can I help you today?",
        {
          gather: true,
          action: '/webhooks/twilio/voice',
          timeout: 10,
          speechTimeout: 3
        }
      );
      
      res.type('text/xml');
      res.send(twiml);
      return;
    }
    
    // Process customer speech
    if (SpeechResult) {
      const customerQuery = SpeechResult;
      
      // Get AI response
      const aiResponse = await geminiService.processCustomerQuery(customerQuery, {
        callSid: CallSid,
        customerPhone: From
      });
      
      // Generate speech
      const optimizedText = elevenlabsService.optimizeTextForSpeech(aiResponse.response);
      const speechData = await elevenlabsService.textToSpeech(optimizedText);
      
      // Save interaction to database
      const call = await prisma.call.findFirst({ where: { callSid: CallSid } });
      if (call) {
        const existingTranscript = call.metadata?.transcript || [];
        const existingAiResponses = call.metadata?.aiResponses || [];
        
        await prisma.call.update({
          where: { id: call.id },
          data: {
            metadata: {
              ...call.metadata,
              transcript: [...existingTranscript, {
                timestamp: new Date().toISOString(),
                speaker: 'customer',
                text: Digits || SpeechResult || 'Voice input',
                type: 'input'
              }],
              aiResponses: [...existingAiResponses, {
                timestamp: new Date().toISOString(),
                response: aiResponse.response,
                intent: aiResponse.intent,
                confidence: aiResponse.confidence,
                shouldEscalate: aiResponse.shouldEscalate
              }]
            }
          }
        });
      }
      
      // Emit real-time update
      // Note: We'd need to get io instance here for real-time updates
      
      let twimlOptions = {
        gather: !aiResponse.shouldEscalate,
        action: '/webhooks/twilio/voice',
        timeout: 10,
        speechTimeout: 3
      };
      
      if (aiResponse.shouldEscalate) {
        twimlOptions.hangup = false;
        // Transfer to human agent
        if (call) {
          await prisma.call.update({
            where: { id: call.id },
            data: {
              status: 'escalated',
              metadata: {
                ...call.metadata,
                escalatedAt: new Date().toISOString(),
                escalationReason: 'AI determined escalation needed'
              }
            }
          });
        }
        
        const twiml = twilioService.generateTwiML(
          aiResponse.response + " Let me transfer you to a human agent who can better assist you.",
          { hangup: true }
        );
        res.type('text/xml');
        res.send(twiml);
        return;
      }
      
      const twiml = twilioService.generateTwiML(aiResponse.response, twimlOptions);
      res.type('text/xml');
      res.send(twiml);
    } else {
      // No speech detected
      const twiml = twilioService.generateTwiML(
        "I didn't catch that. Could you please repeat your question?",
        {
          gather: true,
          action: '/webhooks/twilio/voice',
          timeout: 10,
          speechTimeout: 3
        }
      );
      
      res.type('text/xml');
      res.send(twiml);
    }
  } catch (error) {
    logger.error(`Twilio voice webhook error: ${error.message}`);
    
    const errorTwiml = twilioService.generateTwiML(
      "I'm sorry, I'm experiencing technical difficulties. Please try calling again later.",
      { hangup: true }
    );
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Twilio webhook for call status updates
router.post('/twilio/call-status', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, From, To } = req.body;
    
    logger.info(`Call status update: ${CallSid} - ${CallStatus}`);
    
    // Update call status in database
    const call = await prisma.call.findFirst({ where: { callSid: CallSid } });
    if (call) {
      const updateData = {
        status: CallStatus === 'completed' ? 'completed' : CallStatus,
        metadata: {
          ...call.metadata,
          twilioStatus: CallStatus,
          statusUpdated: new Date().toISOString()
        }
      };
      
      if (CallStatus === 'completed' && CallDuration) {
        updateData.duration = parseInt(CallDuration);
        updateData.endTime = new Date();
      }
      
      await prisma.call.update({
        where: { id: call.id },
        data: updateData
      });
    }
    
    // Emit real-time update for dashboard
    // Note: We'd need to get io instance here
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Call status webhook error: ${error.message}`);
    res.status(500).send('Error');
  }
});

// Twilio webhook for recording status
router.post('/twilio/recording-status', async (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingStatus } = req.body;
    
    logger.info(`Recording status update: ${RecordingSid} - ${RecordingStatus}`);
    
    if (RecordingStatus === 'completed') {
      // Save recording URL to database
      const call = await prisma.call.findFirst({ where: { callSid: CallSid } });
      if (call) {
        await prisma.call.update({
          where: { id: call.id },
          data: {
            metadata: {
              ...call.metadata,
              recordingUrl: RecordingUrl,
              recordingSid: RecordingSid,
              recordingStatus: RecordingStatus,
              recordingDuration: RecordingDuration,
              recordingProcessed: false
            }
          }
        });
        
        // Process recording for transcription and analysis
        // This would typically be done asynchronously
        logger.info(`Recording ready for processing: ${RecordingUrl}`);
        
        // Queue background job for transcription processing
        await queueTranscriptionJob({
          callId: call.id,
          recordingUrl: RecordingUrl,
          recordingSid: RecordingSid,
          callSid: CallSid
        });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Recording status webhook error: ${error.message}`);
    res.status(500).send('Error');
  }
});

/**
 * GET /webhooks - Get all configured webhooks (requires auth)
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // Mock webhook configurations - in production, this would come from database
  const webhooks = [
    {
      id: 'wh_1',
      name: 'Call Status Updates',
      url: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/webhooks/twilio/call-status`,
      events: ['call.started', 'call.completed', 'call.failed'],
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'wh_2',
      name: 'Recording Notifications',
      url: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/webhooks/twilio/recording-status`,
      events: ['recording.completed'],
      status: 'active',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      lastTriggered: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'wh_3',
      name: 'Customer Feedback',
      url: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/webhooks/feedback`,
      events: ['call.feedback'],
      status: 'inactive',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastTriggered: null
    }
  ];

  res.json({ webhooks });
}));

/**
 * GET /webhooks/events - Get available webhook events
 */
router.get('/events', authenticateToken, asyncHandler(async (req, res) => {
  const availableEvents = [
    {
      name: 'call.started',
      description: 'Triggered when a call is initiated',
      payload: {
        callId: 'string',
        from: 'string',
        to: 'string',
        timestamp: 'string'
      }
    },
    {
      name: 'call.completed',
      description: 'Triggered when a call is completed successfully',
      payload: {
        callId: 'string',
        duration: 'number',
        status: 'string',
        timestamp: 'string'
      }
    },
    {
      name: 'call.failed',
      description: 'Triggered when a call fails',
      payload: {
        callId: 'string',
        error: 'string',
        timestamp: 'string'
      }
    },
    {
      name: 'recording.completed',
      description: 'Triggered when call recording is ready',
      payload: {
        callId: 'string',
        recordingUrl: 'string',
        duration: 'number',
        timestamp: 'string'
      }
    },
    {
      name: 'call.feedback',
      description: 'Triggered when customer provides feedback',
      payload: {
        callId: 'string',
        rating: 'number',
        comment: 'string',
        timestamp: 'string'
      }
    },
    {
      name: 'ai.escalation',
      description: 'Triggered when AI escalates to human agent',
      payload: {
        callId: 'string',
        reason: 'string',
        confidence: 'number',
        timestamp: 'string'
      }
    }
  ];

  res.json({ events: availableEvents });
}));

/**
 * POST /webhooks - Create new webhook
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { name, url, events } = req.body;

  if (!name || !url || !events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Name, URL, and events array are required' });
  }

  // Mock webhook creation - in production, this would save to database
  const webhook = {
    id: `wh_${Date.now()}`,
    name,
    url,
    events,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastTriggered: null
  };

  res.status(201).json({ webhook });
}));

/**
 * PUT /webhooks/:id - Update webhook
 */
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, url, events, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Webhook ID is required' });
  }

  // Mock webhook update - in production, this would update database
  const webhook = {
    id,
    name: name || 'Updated Webhook',
    url: url || 'https://example.com/webhook',
    events: events || ['call.completed'],
    status: status || 'active',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastTriggered: new Date().toISOString()
  };

  res.json({ webhook });
}));

/**
 * DELETE /webhooks/:id - Delete webhook
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Webhook ID is required' });
  }

  // Mock webhook deletion - in production, this would delete from database
  res.json({ message: 'Webhook deleted successfully' });
}));

// Generic webhook for testing
router.post('/test', (req, res) => {
  logger.info('Test webhook received:', req.body);
  res.json({ success: true, message: 'Webhook received', data: req.body });
});

module.exports = router;
