const demoCallService = require('../demoCallService');

// Mock dependencies
jest.mock('../geminiService', () => ({
  processCustomerQuery: jest.fn()
}));

jest.mock('../elevenLabsService', () => ({
  textToSpeech: jest.fn()
}));

jest.mock('../emotionDetection', () => ({
  analyzeEmotion: jest.fn()
}));

jest.mock('../../websocket/callMonitoring', () => ({
  broadcastDemoCallTranscript: jest.fn(),
  broadcastDemoCallSentiment: jest.fn(),
  broadcastVoiceInteractionStatus: jest.fn(),
  broadcastAudioResponse: jest.fn()
}));

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

const geminiService = require('../geminiService');
const elevenLabsService = require('../elevenLabsService');
const emotionDetection = require('../emotionDetection');
const { 
  broadcastDemoCallTranscript, 
  broadcastDemoCallSentiment,
  broadcastVoiceInteractionStatus,
  broadcastAudioResponse
} = require('../../websocket/callMonitoring');

describe('DemoCallService - Voice Interaction', () => {
  const testCallId = 'test-call-123';
  const testUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup a demo call for testing
    demoCallService.activeDemoCalls.set(testCallId, {
      id: testCallId,
      userId: testUserId,
      template: 'CUSTOMER_SUPPORT',
      status: 'active',
      startTime: new Date(),
      currentMessageIndex: 0,
      transcript: [],
      overallSentiment: {
        overall: 'neutral',
        score: 0.5,
        emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
      },
      intervalId: null
    });
  });

  afterEach(() => {
    demoCallService.cleanup();
  });

  describe('processCustomerSpeech', () => {
    it('should process customer speech and generate AI response', async () => {
      // Mock dependencies
      emotionDetection.analyzeEmotion.mockResolvedValue({
        overallSentiment: 0.7,
        emotions: { joy: 0.6, anger: 0.1, fear: 0.1, sadness: 0.1, surprise: 0.1 }
      });

      geminiService.processCustomerQuery.mockResolvedValue({
        response: 'I understand your concern. How can I help you?',
        intent: 'general_inquiry',
        confidence: 0.9,
        shouldEscalate: false
      });

      elevenLabsService.textToSpeech.mockResolvedValue({
        audioBuffer: Buffer.from('mock audio data'),
        contentType: 'audio/mpeg',
        size: 1024
      });

      const transcript = 'I need help with my account';
      const result = await demoCallService.processCustomerSpeech(testCallId, transcript, false);

      // Verify the result
      expect(result).toMatchObject({
        callId: testCallId,
        customerTranscript: transcript,
        aiResponse: 'I understand your concern. How can I help you?',
        isProcessing: false
      });

      expect(result.audioUrl).toMatch(/\/audio\/demo-call-.*\.mp3/);
      expect(result.transcriptId).toBeDefined();

      // Verify dependencies were called
      expect(emotionDetection.analyzeEmotion).toHaveBeenCalledWith(transcript, 'demo-call');
      expect(geminiService.processCustomerQuery).toHaveBeenCalledWith(
        transcript,
        expect.objectContaining({
          conversationHistory: expect.any(Array),
          customerPhone: expect.any(String),
          callDuration: expect.any(Number),
          overallSentiment: expect.any(Object),
          isDemo: true
        })
      );
      expect(elevenLabsService.textToSpeech).toHaveBeenCalled();

      // Verify broadcasts were sent
      expect(broadcastVoiceInteractionStatus).toHaveBeenCalledWith(testCallId, 'processing');
      expect(broadcastDemoCallTranscript).toHaveBeenCalledTimes(2); // Customer + AI
      expect(broadcastVoiceInteractionStatus).toHaveBeenCalledWith(testCallId, 'speaking');
      expect(broadcastAudioResponse).toHaveBeenCalled();
      expect(broadcastVoiceInteractionStatus).toHaveBeenCalledWith(testCallId, 'idle');
    });

    it('should handle interim results without processing', async () => {
      const transcript = 'I need help...';
      const result = await demoCallService.processCustomerSpeech(testCallId, transcript, true);

      expect(result).toMatchObject({
        callId: testCallId,
        customerTranscript: transcript,
        isProcessing: false,
        isInterim: true
      });

      // Should broadcast listening status for interim results
      expect(broadcastVoiceInteractionStatus).toHaveBeenCalledWith(testCallId, 'listening');

      // Should not call AI services for interim results
      expect(geminiService.processCustomerQuery).not.toHaveBeenCalled();
      expect(elevenLabsService.textToSpeech).not.toHaveBeenCalled();
    });

    it('should handle non-existent demo call', async () => {
      const nonExistentCallId = 'non-existent-call';
      
      await expect(
        demoCallService.processCustomerSpeech(nonExistentCallId, 'Hello', false)
      ).rejects.toThrow('Demo call not found');
    });

    it('should handle AI service errors gracefully', async () => {
      emotionDetection.analyzeEmotion.mockResolvedValue({
        overallSentiment: 0.5,
        emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
      });

      geminiService.processCustomerQuery.mockRejectedValue(new Error('AI service error'));

      elevenLabsService.textToSpeech.mockResolvedValue({
        audioBuffer: Buffer.from('mock audio data'),
        contentType: 'audio/mpeg',
        size: 1024
      });

      const transcript = 'I need help with my account';
      const result = await demoCallService.processCustomerSpeech(testCallId, transcript, false);

      // Should still return a result with fallback response
      expect(result).toMatchObject({
        callId: testCallId,
        customerTranscript: transcript,
        aiResponse: expect.stringContaining('I understand your concern'),
        isProcessing: false
      });
    });

    it('should handle audio generation errors gracefully', async () => {
      emotionDetection.analyzeEmotion.mockResolvedValue({
        overallSentiment: 0.5,
        emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
      });

      geminiService.processCustomerQuery.mockResolvedValue({
        response: 'I can help you with that.',
        intent: 'general_inquiry',
        confidence: 0.9,
        shouldEscalate: false
      });

      elevenLabsService.textToSpeech.mockRejectedValue(new Error('TTS service error'));

      const transcript = 'I need help';
      const result = await demoCallService.processCustomerSpeech(testCallId, transcript, false);

      // Should still return a result but without audio URL
      expect(result).toMatchObject({
        callId: testCallId,
        customerTranscript: transcript,
        aiResponse: 'I can help you with that.',
        audioUrl: null,
        isProcessing: false
      });
    });
  });

  describe('enableVoiceInteraction', () => {
    it('should enable voice interaction and stop conversation simulation', () => {
      // Setup a demo call with active simulation
      const demoCall = demoCallService.activeDemoCalls.get(testCallId);
      demoCall.intervalId = setTimeout(() => {}, 1000);

      demoCallService.enableVoiceInteraction(testCallId);

      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(true);
      expect(demoCall.intervalId).toBeNull();
      expect(broadcastVoiceInteractionStatus).toHaveBeenCalledWith(testCallId, 'idle');
    });
  });

  describe('disableVoiceInteraction', () => {
    it('should disable voice interaction', () => {
      demoCallService.enableVoiceInteraction(testCallId);
      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(true);

      demoCallService.disableVoiceInteraction(testCallId);
      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(false);
    });
  });

  describe('isVoiceInteractionEnabled', () => {
    it('should return false by default', () => {
      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(false);
    });

    it('should return true after enabling', () => {
      demoCallService.enableVoiceInteraction(testCallId);
      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(true);
    });
  });

  describe('generateAIResponse', () => {
    it('should generate AI response with conversation context', async () => {
      const demoCall = demoCallService.activeDemoCalls.get(testCallId);
      demoCall.transcript = [
        {
          speaker: 'customer',
          text: 'Hello',
          timestamp: new Date().toISOString()
        }
      ];

      geminiService.processCustomerQuery.mockResolvedValue({
        response: 'Hello! How can I help you?',
        intent: 'greeting',
        confidence: 0.95,
        shouldEscalate: false
      });

      const result = await demoCallService.generateAIResponse(testCallId, 'Hello', demoCall);

      expect(result).toMatchObject({
        response: 'Hello! How can I help you?',
        intent: 'greeting',
        confidence: 0.95,
        shouldEscalate: false
      });

      expect(geminiService.processCustomerQuery).toHaveBeenCalledWith(
        'Hello',
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({
              speaker: 'customer',
              content: 'Hello'
            })
          ]),
          isDemo: true
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should clear all voice interaction data', () => {
      demoCallService.enableVoiceInteraction(testCallId);
      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(true);

      demoCallService.cleanup();

      expect(demoCallService.isVoiceInteractionEnabled(testCallId)).toBe(false);
      expect(demoCallService.activeDemoCalls.size).toBe(0);
    });
  });
});
