const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Import voice analysis service
let voiceAnalysisService;
try {
  voiceAnalysisService = require('../services/voiceAnalysisService');
} catch (error) {
  logger.warn('Voice analysis service not available, using mock responses');
  voiceAnalysisService = {
    transcribeAudio: async (audioBuffer, format) => ({
      text: 'Mock transcription for testing purposes',
      confidence: 0.8,
      language: 'en-US'
    })
  };
}

/**
 * Transcribe audio using fallback service
 */
router.post('/transcribe', authenticateToken, async (req, res) => {
  try {
    const { audioData, format = 'webm', isFinal = true } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required'
      });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Transcribe using voice analysis service
    const transcription = await voiceAnalysisService.transcribeAudio(audioBuffer, format);

    if (!transcription || !transcription.text) {
      return res.json({
        success: true,
        data: {
          transcript: '',
          confidence: 0,
          language: 'en-US',
          isFinal
        }
      });
    }

    res.json({
      success: true,
      data: {
        transcript: transcription.text,
        confidence: transcription.confidence || 0.8,
        language: transcription.language || 'en-US',
        isFinal,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Speech transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio',
      details: error.message
    });
  }
});

/**
 * Get speech recognition capabilities
 */
router.get('/capabilities', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        supportedFormats: ['webm', 'wav', 'mp3', 'ogg'],
        supportedLanguages: [
          'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 
          'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 
          'zh-CN', 'ar-SA'
        ],
        maxAudioDuration: 60, // seconds
        realTimeSupported: true,
        confidenceScoring: true
      }
    });
  } catch (error) {
    logger.error('Error getting speech capabilities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get speech capabilities'
    });
  }
});

/**
 * Real-time speech processing endpoint
 */
router.post('/process-stream', authenticateToken, async (req, res) => {
  try {
    const { callId, audioChunk, sequenceNumber, timestamp } = req.body;

    if (!callId || !audioChunk) {
      return res.status(400).json({
        success: false,
        error: 'Call ID and audio chunk are required'
      });
    }

    // Process audio chunk for real-time transcription
    const audioBuffer = Buffer.from(audioChunk, 'base64');
    
    // For real-time processing, we might want to use a streaming approach
    // For now, we'll process individual chunks
    const transcription = await voiceAnalysisService.transcribeAudio(audioBuffer, 'webm');

    res.json({
      success: true,
      data: {
        callId,
        sequenceNumber,
        transcript: transcription?.text || '',
        confidence: transcription?.confidence || 0,
        isInterim: true,
        timestamp: timestamp || Date.now()
      }
    });

  } catch (error) {
    logger.error('Real-time speech processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process speech stream',
      details: error.message
    });
  }
});

/**
 * Voice activity detection endpoint
 */
router.post('/detect-activity', authenticateToken, async (req, res) => {
  try {
    const { audioData, threshold = 0.01 } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required'
      });
    }

    // Simple voice activity detection based on audio energy
    const audioBuffer = Buffer.from(audioData, 'base64');
    const activity = detectVoiceActivity(audioBuffer, threshold);

    res.json({
      success: true,
      data: {
        hasVoice: activity.hasVoice,
        confidence: activity.confidence,
        energy: activity.energy,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    logger.error('Voice activity detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect voice activity',
      details: error.message
    });
  }
});

/**
 * Simple voice activity detection
 */
function detectVoiceActivity(audioBuffer, threshold) {
  try {
    // Simple energy-based voice activity detection
    // In production, you'd use more sophisticated algorithms
    
    let energy = 0;
    const samples = new Int16Array(audioBuffer.buffer);
    
    for (let i = 0; i < samples.length; i++) {
      energy += Math.abs(samples[i]);
    }
    
    energy = energy / samples.length / 32768; // Normalize
    
    return {
      hasVoice: energy > threshold,
      confidence: Math.min(energy / threshold, 1.0),
      energy: energy
    };
  } catch (error) {
    logger.error('Error in voice activity detection:', error);
    return {
      hasVoice: false,
      confidence: 0,
      energy: 0
    };
  }
}

module.exports = router;
