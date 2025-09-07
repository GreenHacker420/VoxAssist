const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const twilioService = require('../services/twilioService');
const geminiService = require('../services/geminiService');
const elevenlabsService = require('../services/elevenlabsService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

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
      
      // TODO: Save interaction to database
      
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
        // TODO: Transfer to human agent
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
    
    // TODO: Update call status in database
    
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
      // TODO: Save recording URL to database
      // TODO: Process recording for transcription and analysis
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
