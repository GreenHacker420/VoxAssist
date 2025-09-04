const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const elevenlabsService = require('../services/elevenlabsService');
const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

// Get all calls
router.get('/', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement database query for calls
    const calls = []; // Placeholder
    res.json({ success: true, data: calls });
  } catch (error) {
    logger.error(`Error fetching calls: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch calls' });
  }
});

// Get specific call details
router.get('/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const callDetails = await twilioService.getCallDetails(callId);
    const recordings = await twilioService.getRecordings(callId);
    
    res.json({ 
      success: true, 
      data: { 
        ...callDetails, 
        recordings 
      } 
    });
  } catch (error) {
    logger.error(`Error fetching call details: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch call details' });
  }
});

// Initiate a new call
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, callbackUrl } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const call = await twilioService.initiateCall(phoneNumber, callbackUrl);
    
    // TODO: Save call to database
    
    res.json({ success: true, data: call });
  } catch (error) {
    logger.error(`Error initiating call: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to initiate call' });
  }
});

// End a call
router.post('/:callId/end', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    await twilioService.endCall(callId);
    
    // TODO: Update call status in database
    
    res.json({ success: true, message: 'Call ended successfully' });
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
    
    // TODO: Save interaction to database
    
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
    
    // TODO: Fetch transcript from database
    const transcript = []; // Placeholder
    
    res.json({ success: true, data: transcript });
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
    
    // TODO: Update sentiment in database
    
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
