const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const geminiService = require('../services/geminiService');
const elevenlabsService = require('../services/elevenlabsService');
const logger = require('../utils/logger');

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

// Generic webhook for testing
router.post('/test', (req, res) => {
  logger.info('Test webhook received:', req.body);
  res.json({ success: true, message: 'Webhook received', data: req.body });
});

module.exports = router;
