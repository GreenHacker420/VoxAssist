const request = require('supertest');
const express = require('express');
const multer = require('multer');
const demoCallRoutes = require('../demoCalls');

// Mock dependencies
jest.mock('../../services/demoCallService', () => ({
  processCustomerSpeech: jest.fn(),
  enableVoiceInteraction: jest.fn(),
  disableVoiceInteraction: jest.fn(),
  isVoiceInteractionEnabled: jest.fn(),
  getDemoCall: jest.fn(),
  createDemoCall: jest.fn(),
  endDemoCall: jest.fn()
}));

jest.mock('../../middleware/demoAuth', () => ({
  authenticateTokenOrDemo: (req, res, next) => {
    req.user = { id: 'test-user' };
    next();
  },
  isDemoRequest: jest.fn().mockReturnValue(true)
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const demoCallService = require('../../services/demoCallService');

describe('Demo Calls API Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/demo-calls', demoCallRoutes);
    
    jest.clearAllMocks();
  });

  describe('POST /api/demo-calls/:id/speech', () => {
    const testCallId = 'test-call-123';

    it('should process speech with text only', async () => {
      const mockResponse = {
        callId: testCallId,
        customerTranscript: 'Hello, I need help',
        aiResponse: 'How can I assist you?',
        audioUrl: '/audio/response.mp3',
        sentiment: {
          overall: 'neutral',
          score: 0.5,
          emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
        },
        isProcessing: false,
        transcriptId: 'transcript-123',
        isInterim: false
      };

      demoCallService.processCustomerSpeech.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello, I need help')
        .field('isInterim', 'false')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          callId: testCallId,
          customerTranscript: 'Hello, I need help',
          aiResponse: 'How can I assist you?',
          audioUrl: '/audio/response.mp3',
          isProcessing: false,
          hasAudioFile: false
        }
      });

      expect(demoCallService.processCustomerSpeech).toHaveBeenCalledWith(
        testCallId,
        'Hello, I need help',
        false,
        undefined
      );
    });

    it('should process speech with audio file', async () => {
      const mockResponse = {
        callId: testCallId,
        customerTranscript: 'Hello, I need help',
        aiResponse: 'How can I assist you?',
        audioUrl: '/audio/response.mp3',
        isProcessing: false,
        transcriptId: 'transcript-123'
      };

      demoCallService.processCustomerSpeech.mockResolvedValue(mockResponse);

      const audioBuffer = Buffer.from('fake audio data');

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello, I need help')
        .field('isInterim', 'false')
        .attach('audioData', audioBuffer, 'speech.wav')
        .expect(200);

      expect(response.body.data.hasAudioFile).toBe(true);
      expect(demoCallService.processCustomerSpeech).toHaveBeenCalledWith(
        testCallId,
        'Hello, I need help',
        false,
        expect.objectContaining({
          buffer: expect.any(Buffer),
          mimetype: 'audio/wav',
          originalname: 'speech.wav'
        })
      );
    });

    it('should handle interim results', async () => {
      const mockResponse = {
        callId: testCallId,
        customerTranscript: 'Hello...',
        isProcessing: false,
        isInterim: true
      };

      demoCallService.processCustomerSpeech.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello...')
        .field('isInterim', 'true')
        .expect(200);

      expect(response.body.data.isInterim).toBe(true);
      expect(demoCallService.processCustomerSpeech).toHaveBeenCalledWith(
        testCallId,
        'Hello...',
        true,
        undefined
      );
    });

    it('should return 400 for missing transcript', async () => {
      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('isInterim', 'false')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Call ID and transcript are required'
      });
    });

    it('should handle service errors', async () => {
      demoCallService.processCustomerSpeech.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello')
        .field('isInterim', 'false')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to process speech input'
      });
    });
  });

  describe('POST /api/demo-calls/:id/enable-voice', () => {
    const testCallId = 'test-call-123';

    it('should enable voice interaction', async () => {
      demoCallService.getDemoCall.mockReturnValue({
        id: testCallId,
        status: 'active'
      });

      demoCallService.enableVoiceInteraction.mockReturnValue(undefined);

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/enable-voice`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          callId: testCallId,
          voiceInteractionEnabled: true,
          message: 'Voice interaction enabled successfully'
        }
      });

      expect(demoCallService.enableVoiceInteraction).toHaveBeenCalledWith(testCallId);
    });

    it('should return 404 for non-existent call', async () => {
      demoCallService.getDemoCall.mockReturnValue(null);

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/enable-voice`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Demo call not found'
      });
    });
  });

  describe('POST /api/demo-calls/:id/disable-voice', () => {
    const testCallId = 'test-call-123';

    it('should disable voice interaction', async () => {
      demoCallService.getDemoCall.mockReturnValue({
        id: testCallId,
        status: 'active'
      });

      demoCallService.disableVoiceInteraction.mockReturnValue(undefined);

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/disable-voice`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          callId: testCallId,
          voiceInteractionEnabled: false,
          message: 'Voice interaction disabled successfully'
        }
      });

      expect(demoCallService.disableVoiceInteraction).toHaveBeenCalledWith(testCallId);
    });
  });

  describe('Audio file handling', () => {
    const testCallId = 'test-call-123';

    it('should reject non-audio files', async () => {
      const textBuffer = Buffer.from('This is not audio');

      const response = await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello')
        .attach('audioData', textBuffer, 'document.txt')
        .expect(400);

      expect(response.body.error).toContain('Only audio files are allowed');
    });

    it('should accept various audio formats', async () => {
      const mockResponse = {
        callId: testCallId,
        customerTranscript: 'Hello',
        isProcessing: false
      };

      demoCallService.processCustomerSpeech.mockResolvedValue(mockResponse);

      const audioBuffer = Buffer.from('fake audio data');

      // Test WAV
      await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello')
        .attach('audioData', audioBuffer, { filename: 'speech.wav', contentType: 'audio/wav' })
        .expect(200);

      // Test MP3
      await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello')
        .attach('audioData', audioBuffer, { filename: 'speech.mp3', contentType: 'audio/mpeg' })
        .expect(200);

      // Test WebM
      await request(app)
        .post(`/api/demo-calls/${testCallId}/speech`)
        .field('transcript', 'Hello')
        .attach('audioData', audioBuffer, { filename: 'speech.webm', contentType: 'audio/webm' })
        .expect(200);
    });
  });
});
