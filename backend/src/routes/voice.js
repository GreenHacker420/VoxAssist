const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const voiceProcessingPipeline = require('../services/voiceProcessingPipeline');
const logger = require('../utils/logger');

// Handle incoming calls from Twilio
router.post('/incoming', async (req, res) => {
  try {
    const { CallSid, From, To } = req.body;
    
    logger.info(`Incoming call: ${CallSid} from ${From} to ${To}`);
    
    // Process the incoming call through our pipeline
    const twiml = await voiceProcessingPipeline.handleIncomingCall(CallSid, From, To);
    
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error) {
    logger.error(`Error handling incoming call: ${error.message}`);
    
    // Fallback TwiML
    const fallbackTwiml = twilioService.generateTwiML(
      "I'm sorry, I'm experiencing technical difficulties. Please try calling back in a few minutes.",
      { hangup: true }
    );
    
    res.type('text/xml');
    res.send(fallbackTwiml);
  }
});

// Process speech input from Twilio
router.post('/process-speech', async (req, res) => {
  try {
    const { CallSid, SpeechResult, Confidence } = req.body;
    
    logger.info(`Processing speech for call ${CallSid}: ${SpeechResult} (confidence: ${Confidence})`);
    
    // Process speech through our AI pipeline
    const twiml = await voiceProcessingPipeline.processSpeechInput(
      CallSid, 
      SpeechResult, 
      parseFloat(Confidence)
    );
    
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error) {
    logger.error(`Error processing speech: ${error.message}`);
    
    // Fallback response
    const fallbackTwiml = twilioService.generateTwiML(
      "I didn't catch that. Could you please repeat your question?",
      { 
        gather: true,
        action: '/api/voice/process-speech'
      }
    );
    
    res.type('text/xml');
    res.send(fallbackTwiml);
  }
});

// Handle call status updates
router.post('/call-status', async (req, res) => {
  try {
    const { CallSid, CallStatus, Duration } = req.body;
    
    logger.info(`Call status update: ${CallSid} - ${CallStatus}`);
    
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      await voiceProcessingPipeline.endCall(CallSid, CallStatus);
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    logger.error(`Error handling call status: ${error.message}`);
    res.status(500).send('Error');
  }
});

// Handle recording status updates
router.post('/recording-status', async (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingStatus } = req.body;
    
    logger.info(`Recording status: ${RecordingSid} for call ${CallSid} - ${RecordingStatus}`);
    
    if (RecordingStatus === 'completed') {
      // Store recording URL in database
      const db = require('../database/connection');
      await db.query(
        'UPDATE calls SET recording_url = $1 WHERE call_sid = $2',
        [RecordingUrl, CallSid]
      );
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    logger.error(`Error handling recording status: ${error.message}`);
    res.status(500).send('Error');
  }
});

// Initiate outbound call
router.post('/initiate-call', async (req, res) => {
  try {
    const { phoneNumber, organizationId } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const callbackUrl = `${process.env.BASE_URL}/api/voice`;
    const call = await twilioService.initiateCall(phoneNumber, callbackUrl);
    
    res.json({
      success: true,
      data: call
    });
    
  } catch (error) {
    logger.error(`Error initiating call: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate call'
    });
  }
});

// Get active calls
router.get('/active-calls', async (req, res) => {
  try {
    const activeCalls = voiceProcessingPipeline.getActiveCalls();
    
    res.json({
      success: true,
      data: {
        count: activeCalls.length,
        calls: activeCalls
      }
    });
    
  } catch (error) {
    logger.error(`Error fetching active calls: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active calls'
    });
  }
});

// End call manually
router.post('/end-call/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;
    
    await twilioService.endCall(callSid);
    await voiceProcessingPipeline.endCall(callSid, 'manually_ended');
    
    res.json({
      success: true,
      message: 'Call ended successfully'
    });
    
  } catch (error) {
    logger.error(`Error ending call: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to end call'
    });
  }
});

// Hold music for escalated calls
router.post('/hold-music', async (req, res) => {
  try {
    const { CallSid } = req.body;
    
    const twiml = twilioService.generateTwiML('', {
      redirect: '/api/voice/hold-music' // Loop hold music
    });
    
    // Add hold music URL if available
    const holdMusicTwiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play loop="0">https://demo.twilio.com/docs/classic.mp3</Play>
        <Redirect>/api/voice/hold-music</Redirect>
      </Response>
    `;
    
    res.type('text/xml');
    res.send(holdMusicTwiml);
    
  } catch (error) {
    logger.error(`Error serving hold music: ${error.message}`);
    res.status(500).send('Error');
  }
});

// Serve audio files generated by ElevenLabs
router.get('/audio/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // TODO: Implement actual file serving from storage
    // For now, return a placeholder
    res.status(404).json({
      success: false,
      message: 'Audio file not found'
    });
    
  } catch (error) {
    logger.error(`Error serving audio file: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to serve audio file'
    });
  }
});

module.exports = router;
