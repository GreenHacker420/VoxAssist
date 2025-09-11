const logger = require('../utils/logger');
const realTimeAIService = require('./realTimeAIService');
const realTimeTTSService = require('./realTimeTTSService');
const performanceMonitor = require('./performanceMonitor');

class DemoCallService {
  constructor() {
    this.demoCalls = new Map();
    this.wsConnections = new Map(); // Store WebSocket connections for broadcasting
  }

  // Create a new demo call
  createDemoCall(callId, options = {}) {
    const demoCall = {
      id: callId,
      status: 'active',
      startTime: new Date(),
      transcript: [],
      participants: ['user', 'ai'],
      currentSentiment: {
        overall: 'neutral',
        score: 0.5,
        emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
      },
      voiceAnalysis: null,
      ...options
    };

    this.demoCalls.set(callId, demoCall);
    logger.info(`Demo call created: ${callId}`);
    return demoCall;
  }

  // Get demo call by ID
  getDemoCall(callId) {
    return this.demoCalls.get(callId);
  }

  // Get performance report
  getPerformanceReport() {
    return performanceMonitor.getPerformanceReport();
  }

  // Add WebSocket connection for broadcasting
  addConnection(callId, ws) {
    if (!this.wsConnections.has(callId)) {
      this.wsConnections.set(callId, new Set());
    }
    this.wsConnections.get(callId).add(ws);
    logger.info(`WebSocket connection added for demo call: ${callId}`);
  }

  // Remove WebSocket connection
  removeConnection(callId, ws) {
    if (this.wsConnections.has(callId)) {
      this.wsConnections.get(callId).delete(ws);
      if (this.wsConnections.get(callId).size === 0) {
        this.wsConnections.delete(callId);
      }
    }
    logger.info(`WebSocket connection removed for demo call: ${callId}`);
  }

  // Broadcast message to all connections for a call
  broadcast(callId, message) {
    if (this.wsConnections.has(callId)) {
      const connections = this.wsConnections.get(callId);
      const messageStr = JSON.stringify(message);

      // Log message details for debugging
      logger.info(`Broadcasting message to ${connections.size} connections for call ${callId}:`, {
        type: message.type,
        hasText: !!message.text,
        hasAudioData: !!message.audioData,
        audioDataLength: message.audioData ? message.audioData.length : 0,
        messageSize: messageStr.length
      });

      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          try {
            ws.send(messageStr);
            logger.debug(`Message sent successfully to WebSocket for call ${callId}`);
          } catch (error) {
            logger.error(`Failed to send message to WebSocket: ${error.message}`);
            connections.delete(ws);
          }
        } else {
          logger.warn(`WebSocket not open for call ${callId}, removing connection`);
          connections.delete(ws);
        }
      });
    } else {
      logger.warn(`No WebSocket connections found for call ${callId}`);
    }
  }

  // Process voice input and generate AI response
  async processVoiceInput(callId, audioBuffer, format = 'webm', audioMetrics = {}) {
    try {
      // Start performance monitoring for complete conversation cycle
      performanceMonitor.startTiming(callId, 'complete_conversation_cycle');

      const demoCall = this.getDemoCall(callId);
      if (!demoCall) {
        throw new Error(`Demo call not found: ${callId}`);
      }

      logger.info(`Processing voice input for demo call: ${callId}, format: ${format}, size: ${audioBuffer.length} bytes`);

      // Convert audio buffer to base64 for processing
      const audioBase64 = audioBuffer.toString('base64');

      // Simulate speech-to-text processing (in real implementation, this would call a STT service)
      performanceMonitor.startTiming(callId, 'speech_to_text');
      const transcriptText = await this.simulateSTT(audioBase64, format);
      performanceMonitor.endTiming(callId, 'speech_to_text', {
        audioSize: audioBuffer.length,
        format,
        transcriptLength: transcriptText?.length || 0
      });
      
      if (!transcriptText) {
        logger.warn(`No transcript generated for demo call: ${callId}`);
        return null;
      }

      // Create transcript entry for user
      const userTranscriptEntry = {
        id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        speaker: 'customer',
        text: transcriptText,
        timestamp: new Date().toISOString(),
        confidence: 0.85 + Math.random() * 0.1, // Simulate confidence 0.85-0.95
        sentiment: this.analyzeSentiment(transcriptText),
        audioMetrics
      };

      // Add to transcript
      demoCall.transcript.push(userTranscriptEntry);

      // Broadcast user transcript
      this.broadcast(callId, {
        type: 'transcript_entry',
        entry: userTranscriptEntry
      });

      // Generate AI response (without duplicate streaming)
      performanceMonitor.startTiming(callId, 'ai_processing');
      const aiResponse = await this.generateAIResponse(transcriptText, demoCall.transcript, callId);
      performanceMonitor.endTiming(callId, 'ai_processing', {
        inputLength: transcriptText.length,
        responseLength: aiResponse?.text?.length || 0
      });
      
      if (aiResponse) {
        // Create transcript entry for AI
        const aiTranscriptEntry = {
          id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          speaker: 'ai',
          text: aiResponse.text,
          timestamp: new Date().toISOString(),
          confidence: 0.95,
          sentiment: 'neutral'
        };

        // Add to transcript
        demoCall.transcript.push(aiTranscriptEntry);

        // Broadcast AI transcript
        this.broadcast(callId, {
          type: 'transcript_entry',
          entry: aiTranscriptEntry
        });

        // Generate and broadcast AI audio response
        if (aiResponse.text) {
          try {
            logger.info(`Generating audio for AI response: "${aiResponse.text}"`);
            performanceMonitor.startTiming(callId, 'text_to_speech');
            const audioResponse = await this.generateAIAudio(aiResponse.text, callId);
            performanceMonitor.endTiming(callId, 'text_to_speech', {
              textLength: aiResponse.text.length,
              audioSize: audioResponse?.audioData?.length || 0
            });

            if (audioResponse && audioResponse.audioData) {
              logger.info(`Audio generated successfully, sending audio_response message`);
              performanceMonitor.startTiming(callId, 'audio_transmission');
              this.broadcast(callId, {
                type: 'audio_response',
                text: aiResponse.text,
                audioData: audioResponse.audioData,
                contentType: audioResponse.contentType,
                transcriptId: aiTranscriptEntry.id
              });
              performanceMonitor.endTiming(callId, 'audio_transmission', {
                audioSize: audioResponse.audioData.length
              });

              // Complete the conversation cycle timing
              const cycleMetrics = performanceMonitor.completeConversationCycle(callId);
              if (cycleMetrics && !cycleMetrics.isOptimal) {
                logger.warn(`🐌 Slow conversation cycle detected: ${cycleMetrics.totalTime}ms (target: <2000ms)`);
              }
            } else {
              logger.warn(`No audio data generated, sending text-only response`);
              // Still send text response even if audio generation fails
              this.broadcast(callId, {
                type: 'audio_response',
                text: aiResponse.text,
                transcriptId: aiTranscriptEntry.id
              });
            }
          } catch (audioError) {
            logger.error(`Failed to generate AI audio: ${audioError.message}`);
            // Still send text response even if audio fails
            this.broadcast(callId, {
              type: 'audio_response',
              text: aiResponse.text,
              transcriptId: aiTranscriptEntry.id
            });
          }
        }
      }

      return {
        transcriptEntry: userTranscriptEntry,
        aiResponse: aiResponse
      };

    } catch (error) {
      logger.error(`Failed to process voice input for demo call ${callId}: ${error.message}`);
      
      // Broadcast error to client
      this.broadcast(callId, {
        type: 'error',
        message: `Failed to process voice input: ${error.message}`
      });
      
      throw error;
    }
  }

  // Simulate speech-to-text conversion
  async simulateSTT(audioBase64, format) {
    // In a real implementation, this would call a STT service like Google Speech-to-Text
    // For demo purposes, we'll analyze the audio buffer size to simulate different responses

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const audioSize = audioBuffer.length;

      logger.info(`Processing audio for STT: ${audioSize} bytes, format: ${format}`);

      // Simulate processing delay based on audio length
      const processingTime = Math.min(2000, 500 + (audioSize / 1000));
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Generate contextual responses based on audio characteristics
      let responses;

      if (audioSize < 5000) {
        // Short audio - likely greetings or simple questions
        responses = [
          "Hello, how are you today?",
          "Hi there!",
          "Good morning!",
          "Can you help me?",
          "Thank you.",
          "Yes, please.",
          "No, thank you."
        ];
      } else if (audioSize < 15000) {
        // Medium audio - questions or requests
        responses = [
          "I need help with my account.",
          "Can you tell me about your services?",
          "What are your business hours?",
          "How much does this cost?",
          "Can you explain how this works?",
          "I'm having trouble with my order.",
          "What's the weather like today?",
          "Could you please help me with this issue?"
        ];
      } else {
        // Longer audio - detailed questions or explanations
        responses = [
          "I'd like to speak to a manager about a problem I'm having with my recent order.",
          "Can you walk me through the process of setting up my account and getting started?",
          "I'm experiencing some technical difficulties and need assistance troubleshooting the issue.",
          "Could you provide more information about your pricing plans and what's included?",
          "I have a complex question about your services and would appreciate detailed information.",
          "I need to understand the terms and conditions before I can proceed with this.",
          "Can you help me understand why I'm seeing these charges on my account?"
        ];
      }

      const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
      logger.info(`STT simulation result: "${selectedResponse}"`);

      return selectedResponse;

    } catch (error) {
      logger.error(`STT simulation error: ${error.message}`);
      return "I'm sorry, I didn't catch that. Could you please repeat?";
    }
  }

  // Generate AI response using the real-time AI service
  async generateAIResponse(userInput, conversationHistory, callId) {
    try {
      logger.info(`Generating AI response for user input: "${userInput}"`);

      // Use the existing real-time AI service
      const response = await realTimeAIService.processUserInput(callId, userInput, {
        conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
        responseType: 'conversational',
        maxTokens: 150
      });

      logger.info(`AI response generated: "${response.text || response.response}"`);

      return {
        text: response.text || response.response || "I understand. How can I help you further?",
        confidence: response.confidence || 0.9
      };
    } catch (error) {
      logger.error(`Failed to generate AI response: ${error.message}`);

      // Fallback responses
      const fallbackResponses = [
        "I understand. How can I help you with that?",
        "That's interesting. Can you tell me more?",
        "I see. Let me help you with that.",
        "Thank you for sharing that. What would you like to know?",
        "I'm here to help. What can I do for you?",
        "That makes sense. How can I assist you further?",
        "I appreciate you letting me know. What's your next question?",
        "Got it. Is there anything specific you'd like help with?"
      ];

      return {
        text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        confidence: 0.8
      };
    }
  }

  // Note: Removed duplicate streaming methods to fix duplicate audio playback
  // The system now uses a single audio_response message type for consistency

  // Generate AI audio response using fast TTS
  async generateAIAudio(text, callId = 'demo-call') {
    try {
      // Use ElevenLabs fast TTS directly for optimal speed
      const elevenlabsService = require('./elevenlabsService');
      const audioResponse = await elevenlabsService.fastTextToSpeech(text, process.env.ELEVENLABS_VOICE_ID);

      if (audioResponse && audioResponse.audioBuffer) {
        return {
          audioData: Buffer.from(audioResponse.audioBuffer).toString('base64'),
          contentType: audioResponse.contentType || 'audio/mpeg',
          generationTime: audioResponse.generationTime
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to generate AI audio: ${error.message}`);
      return null; // Audio generation failed, but text response can still be sent
    }
  }

  // Simple sentiment analysis
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing', 'perfect', 'thank'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'problem', 'issue', 'wrong', 'error'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // End demo call
  endDemoCall(callId) {
    const demoCall = this.getDemoCall(callId);
    if (demoCall) {
      demoCall.status = 'ended';
      demoCall.endTime = new Date();
      
      // Broadcast call ended
      this.broadcast(callId, {
        type: 'call_ended',
        callId: callId,
        duration: demoCall.endTime - demoCall.startTime
      });

      // Clean up connections
      this.wsConnections.delete(callId);
      
      logger.info(`Demo call ended: ${callId}`);
      return demoCall;
    }
    return null;
  }

  // Get all active demo calls
  getActiveDemoCalls() {
    const activeCalls = [];
    this.demoCalls.forEach((call, callId) => {
      if (call.status === 'active') {
        activeCalls.push(call);
      }
    });
    return activeCalls;
  }
}

// Export singleton instance
module.exports = new DemoCallService();
