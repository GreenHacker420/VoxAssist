const request = require('supertest');
const WebSocket = require('ws');
const app = require('../../server');
const realTimeAIService = require('../../services/realTimeAIService');
const realTimeTTSService = require('../../services/realTimeTTSService');

describe('Voice Conversation Integration Tests', () => {
  let server;
  let wsServer;
  let testCallId;

  beforeAll(async () => {
    // Start test server
    server = app.listen(0);
    const port = server.address().port;
    
    // Initialize WebSocket server
    wsServer = new WebSocket.Server({ server });
    
    // Create test call
    testCallId = `test-call-${Date.now()}`;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (wsServer) {
      wsServer.close();
    }
    
    // Cleanup services
    realTimeAIService.cleanup(testCallId);
    realTimeTTSService.cleanup(testCallId);
  });

  describe('Speech API Endpoints', () => {
    describe('POST /api/speech/transcribe', () => {
      it('should transcribe audio successfully', async () => {
        const mockAudioData = Buffer.from('mock-audio-data').toString('base64');
        
        const response = await request(app)
          .post('/api/speech/transcribe')
          .send({
            audioData: mockAudioData,
            format: 'webm',
            language: 'en-US'
          })
          .expect(200);

        expect(response.body).toHaveProperty('transcript');
        expect(response.body).toHaveProperty('confidence');
        expect(response.body.success).toBe(true);
      });

      it('should handle invalid audio data', async () => {
        const response = await request(app)
          .post('/api/speech/transcribe')
          .send({
            audioData: 'invalid-base64',
            format: 'webm'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid audio data');
      });

      it('should handle missing audio data', async () => {
        const response = await request(app)
          .post('/api/speech/transcribe')
          .send({
            format: 'webm'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Audio data is required');
      });
    });

    describe('POST /api/speech/voice-activity', () => {
      it('should detect voice activity', async () => {
        const mockAudioData = Buffer.from('mock-audio-with-voice').toString('base64');
        
        const response = await request(app)
          .post('/api/speech/voice-activity')
          .send({
            audioData: mockAudioData,
            threshold: 0.01
          })
          .expect(200);

        expect(response.body).toHaveProperty('isActive');
        expect(response.body).toHaveProperty('confidence');
        expect(response.body).toHaveProperty('energy');
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/speech/process-realtime', () => {
      it('should process real-time speech input', async () => {
        const response = await request(app)
          .post('/api/speech/process-realtime')
          .send({
            callId: testCallId,
            transcript: 'Hello, how can you help me?',
            confidence: 0.95,
            isFinal: true
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('processed');
      });
    });
  });

  describe('Real-time AI Service Integration', () => {
    beforeEach(() => {
      // Initialize AI service for test call
      realTimeAIService.initializeConversation(testCallId, {
        language: 'en-US',
        context: 'demo-call'
      });
    });

    afterEach(() => {
      // Cleanup after each test
      realTimeAIService.cleanup(testCallId);
    });

    it('should process user input and generate response', async () => {
      const userInput = 'What services do you offer?';
      
      const result = await realTimeAIService.processUserInput(testCallId, userInput, {
        confidence: 0.9,
        timestamp: Date.now()
      });

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('conversationPhase');
      expect(result.response).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should maintain conversation context', async () => {
      // First interaction
      await realTimeAIService.processUserInput(testCallId, 'Hello', {
        confidence: 0.9
      });

      // Second interaction referencing first
      const result = await realTimeAIService.processUserInput(testCallId, 'What did I just say?', {
        confidence: 0.9
      });

      expect(result.response).toContain('Hello');
    });

    it('should detect conversation phases', async () => {
      const greetingResult = await realTimeAIService.processUserInput(testCallId, 'Hi there!', {
        confidence: 0.9
      });

      expect(greetingResult.conversationPhase).toBe('greeting');

      const questionResult = await realTimeAIService.processUserInput(testCallId, 'What are your hours?', {
        confidence: 0.9
      });

      expect(questionResult.conversationPhase).toBe('inquiry');
    });

    it('should handle escalation scenarios', async () => {
      const result = await realTimeAIService.processUserInput(testCallId, 'I want to speak to a human agent immediately!', {
        confidence: 0.9
      });

      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toBeTruthy();
    });
  });

  describe('Real-time TTS Service Integration', () => {
    beforeEach(() => {
      // Initialize TTS service for test call
      realTimeTTSService.initializeTTS(testCallId, {
        streaming: true,
        voiceId: 'test-voice'
      });
    });

    afterEach(() => {
      // Cleanup after each test
      realTimeTTSService.cleanup(testCallId);
    });

    it('should generate speech from text', async () => {
      const text = 'Hello! How can I help you today?';
      
      const result = await realTimeTTSService.generateSpeech(testCallId, text);

      expect(result).toHaveProperty('generationId');
      expect(result).toHaveProperty('audioData');
      expect(result).toHaveProperty('contentType');
      expect(result).toHaveProperty('duration');
      expect(result.text).toBe(text);
    });

    it('should handle streaming audio generation', async () => {
      const text = 'This is a longer text that should be streamed in chunks for better real-time performance.';
      
      const audioChunks = [];
      realTimeTTSService.on('audioChunk', (chunkData) => {
        if (chunkData.callId === testCallId) {
          audioChunks.push(chunkData);
        }
      });

      const result = await realTimeTTSService.generateSpeech(testCallId, text, {
        streaming: true
      });

      expect(result.streaming).toBe(true);
      expect(audioChunks.length).toBeGreaterThan(0);
      
      // Check that chunks are properly ordered
      audioChunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });

      // Last chunk should be marked as last
      const lastChunk = audioChunks[audioChunks.length - 1];
      expect(lastChunk.isLast).toBe(true);
    });

    it('should manage audio queue properly', async () => {
      const texts = [
        'First message',
        'Second message',
        'Third message'
      ];

      // Generate multiple audio items
      for (const text of texts) {
        await realTimeTTSService.generateSpeech(testCallId, text);
      }

      const stats = realTimeTTSService.getTTSStats(testCallId);
      expect(stats.queueSize).toBe(3);

      // Get audio items from queue
      const firstAudio = realTimeTTSService.getNextAudio(testCallId);
      expect(firstAudio.text).toBe('First message');

      const updatedStats = realTimeTTSService.getTTSStats(testCallId);
      expect(updatedStats.queueSize).toBe(2);
    });

    it('should optimize text for speech', async () => {
      const textWithAbbreviations = 'Dr. Smith said it costs $100 on 12/25/2023.';
      
      const result = await realTimeTTSService.generateSpeech(testCallId, textWithAbbreviations);

      // The optimized text should expand abbreviations
      expect(result.text).toContain('Doctor');
      expect(result.text).toContain('dollars');
    });
  });

  describe('WebSocket Voice Conversation Flow', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${server.address().port}/ws`);
      ws.on('open', () => {
        // Join test call
        ws.send(JSON.stringify({
          type: 'join_call',
          callId: testCallId
        }));
        done();
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should handle complete voice conversation flow', (done) => {
      const messages = [];
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        messages.push(message);

        // Check for expected message types
        if (message.type === 'ai_audio_response') {
          expect(message).toHaveProperty('audioData');
          expect(message).toHaveProperty('text');
          expect(message).toHaveProperty('contentType');
          done();
        }
      });

      // Start voice conversation
      ws.send(JSON.stringify({
        type: 'start_voice_conversation',
        callId: testCallId,
        settings: {
          language: 'en-US',
          streaming: true
        }
      }));

      // Send voice input
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'voice_input',
          callId: testCallId,
          transcript: 'Hello, I need help with my account',
          confidence: 0.95,
          isFinal: true
        }));
      }, 100);
    });

    it('should handle voice stream chunks', (done) => {
      const chunks = [];
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'voice_stream_processed') {
          chunks.push(message);
          
          if (chunks.length >= 3) {
            expect(chunks[0]).toHaveProperty('chunkIndex', 0);
            expect(chunks[chunks.length - 1]).toHaveProperty('isLast', true);
            done();
          }
        }
      });

      // Start voice conversation
      ws.send(JSON.stringify({
        type: 'start_voice_conversation',
        callId: testCallId
      }));

      // Send multiple voice chunks
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'voice_stream_chunk',
            callId: testCallId,
            chunkIndex: i,
            audioChunk: Buffer.from(`chunk-${i}`).toString('base64'),
            isLast: i === 2
          }));
        }, i * 50);
      }
    });

    it('should handle voice activity detection', (done) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'voice_activity_detected') {
          expect(message).toHaveProperty('isActive');
          expect(message).toHaveProperty('confidence');
          done();
        }
      });

      // Start voice conversation
      ws.send(JSON.stringify({
        type: 'start_voice_conversation',
        callId: testCallId
      }));

      // Send voice activity
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'voice_activity_detected',
          callId: testCallId,
          isActive: true,
          confidence: 0.8,
          energy: 0.5
        }));
      }, 100);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle AI service failures gracefully', async () => {
      // Mock AI service failure
      const originalProcessUserInput = realTimeAIService.processUserInput;
      realTimeAIService.processUserInput = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/speech/process-realtime')
        .send({
          callId: testCallId,
          transcript: 'Test message',
          confidence: 0.9,
          isFinal: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.fallback).toBe(true);

      // Restore original function
      realTimeAIService.processUserInput = originalProcessUserInput;
    });

    it('should handle TTS service failures gracefully', async () => {
      // Mock TTS service failure
      const originalGenerateSpeech = realTimeTTSService.generateSpeech;
      realTimeTTSService.generateSpeech = jest.fn().mockRejectedValue(new Error('TTS service unavailable'));

      // This should not throw an error but should handle gracefully
      const result = await realTimeTTSService.generateSpeech(testCallId, 'Test text').catch(() => null);
      
      expect(result).toBeNull();

      // Restore original function
      realTimeTTSService.generateSpeech = originalGenerateSpeech;
    });
  });
});
