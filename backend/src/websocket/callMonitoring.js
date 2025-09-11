const WebSocket = require('ws');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../database/prisma');
const demoCallService = require('../services/demoCallService');

// Global WebSocket clients map
global.wsClients = new Map();

/**
 * Initialize WebSocket server for real-time call monitoring
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    verifyClient: (info) => {
      // Basic verification - in production, implement proper auth
      return true;
    }
  });

  wss.on('connection', (ws, req) => {
    logger.info('WebSocket connection established');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'join_call':
            await handleJoinCall(ws, data.callId, data.token);
            break;
          case 'leave_call':
            handleLeaveCall(ws, data.callId);
            break;
          case 'transcript_message':
            await handleTranscriptMessage(data);
            break;
          case 'sentiment_update':
            await handleSentimentUpdate(data);
            break;
          case 'join_demo_call':
            await handleJoinDemoCall(ws, data.callId, data.token, data.isDemoMode);
            break;
          case 'demo_call_next_message':
            await handleDemoCallNextMessage(ws, data.callId);
            break;
          case 'end_demo_call':
            await handleEndDemoCall(ws, data.callId);
            break;
          case 'voice_input':
            await handleVoiceInput(ws, data);
            break;
          case 'start_voice_conversation':
            await handleStartVoiceConversation(ws, data);
            break;
          case 'voice_stream_chunk':
            await handleVoiceStreamChunk(ws, data);
            break;
          case 'end_voice_stream':
            await handleEndVoiceStream(ws, data);
            break;
          case 'voice_activity_detected':
            await handleVoiceActivityDetected(ws, data);
            break;
        }
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');

      // Remove client from demo call service if it was part of a demo call
      if (ws.demoCallId) {
        try {
          const demoCallService = require('../services/demoCallService');
          demoCallService.removeConnection(ws.demoCallId, ws);
        } catch (error) {
          logger.error('Error removing demo call connection:', error);
        }
      }

      // Remove client from all call rooms
      for (const [callId, clients] of global.wsClients.entries()) {
        const index = clients.indexOf(ws);
        if (index !== -1) {
          clients.splice(index, 1);
          if (clients.length === 0) {
            global.wsClients.delete(callId);
          }
        }
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  return wss;
}

/**
 * Handle client joining a call room
 */
async function handleJoinCall(ws, callId, token) {
  try {
    // Verify user has access to this call
    // In a real implementation, decode and verify the JWT token

    // Auto-create demo call if it doesn't exist (for testing and demo purposes)
    if (!demoCallService.getDemoCall(callId)) {
      logger.info(`Auto-creating demo call: ${callId}`);
      demoCallService.createDemoCall(callId, {
        customerName: 'Demo User',
        customerPhone: '+1-555-DEMO',
        status: 'active'
      });
    }

    // Add WebSocket connection to demo call service
    demoCallService.addConnection(callId, ws);

    if (!global.wsClients.has(callId)) {
      global.wsClients.set(callId, []);
    }

    global.wsClients.get(callId).push(ws);

    ws.send(JSON.stringify({
      type: 'call_joined',
      callId: callId,
      message: 'Successfully joined call monitoring'
    }));

    logger.info(`Client joined call monitoring for call: ${callId}`);
  } catch (error) {
    logger.error('Error joining call:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join call'
    }));
  }
}

/**
 * Handle client leaving a call room
 */
function handleLeaveCall(ws, callId) {
  const clients = global.wsClients.get(callId);
  if (clients) {
    const index = clients.indexOf(ws);
    if (index !== -1) {
      clients.splice(index, 1);
      if (clients.length === 0) {
        global.wsClients.delete(callId);
      }
    }
  }
  
  logger.info(`Client left call monitoring for call: ${callId}`);
}

/**
 * Handle transcript message broadcast
 */
async function handleTranscriptMessage(data) {
  const { callId, message } = data;
  
  try {
    // Store transcript in database
    await prisma.transcript.create({
      data: {
        callId: callId,
        speaker: message.speaker,
        text: message.text,
        timestamp: new Date(message.timestamp),
        confidence: message.confidence || null
      }
    });
    
    // Broadcast to all clients monitoring this call
    broadcastToCall(callId, {
      type: 'transcript_update',
      message: message
    });
    
  } catch (error) {
    logger.error('Error handling transcript message:', error);
  }
}

/**
 * Handle sentiment update broadcast
 */
async function handleSentimentUpdate(data) {
  const { callId, sentiment } = data;
  
  try {
    // Update call sentiment in database
    await prisma.call.update({
      where: { id: callId },
      data: {
        sentiment: sentiment.overall,
        sentimentScore: sentiment.score,
        metadata: {
          emotions: sentiment.emotions,
          lastSentimentUpdate: new Date().toISOString()
        }
      }
    });
    
    // Broadcast to all clients monitoring this call
    broadcastToCall(callId, {
      type: 'sentiment_update',
      sentiment: sentiment
    });
    
  } catch (error) {
    logger.error('Error handling sentiment update:', error);
  }
}

/**
 * Broadcast message to all clients monitoring a specific call
 */
function broadcastToCall(callId, message) {
  const clients = global.wsClients.get(callId);
  if (clients) {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

/**
 * Simulate live transcript updates for demo purposes
 */
function simulateTranscriptUpdates(callId) {
  const sampleMessages = [
    { speaker: 'customer', text: 'Hello, I need help with my account.', confidence: 0.95 },
    { speaker: 'ai', text: 'Hello! I\'d be happy to help you with your account. Can you please provide your account number?', confidence: 1.0 },
    { speaker: 'customer', text: 'Sure, it\'s 12345678.', confidence: 0.92 },
    { speaker: 'ai', text: 'Thank you. I can see your account here. What specific issue are you experiencing?', confidence: 1.0 },
    { speaker: 'customer', text: 'I can\'t access my online banking.', confidence: 0.88 }
  ];
  
  const sampleSentiments = [
    { overall: 'neutral', score: 0.6, emotions: { joy: 0.1, anger: 0.2, fear: 0.3, sadness: 0.1, surprise: 0.3 } },
    { overall: 'positive', score: 0.7, emotions: { joy: 0.4, anger: 0.1, fear: 0.2, sadness: 0.1, surprise: 0.2 } },
    { overall: 'negative', score: 0.3, emotions: { joy: 0.1, anger: 0.4, fear: 0.2, sadness: 0.2, surprise: 0.1 } }
  ];
  
  let messageIndex = 0;
  let sentimentIndex = 0;
  
  const interval = setInterval(() => {
    if (messageIndex < sampleMessages.length) {
      const message = {
        id: `msg-${Date.now()}-${messageIndex}`,
        ...sampleMessages[messageIndex],
        timestamp: new Date().toISOString()
      };
      
      broadcastToCall(callId, {
        type: 'transcript_update',
        message: message
      });
      
      // Update sentiment every 2 messages
      if (messageIndex % 2 === 0 && sentimentIndex < sampleSentiments.length) {
        setTimeout(() => {
          broadcastToCall(callId, {
            type: 'sentiment_update',
            sentiment: sampleSentiments[sentimentIndex]
          });
          sentimentIndex++;
        }, 1000);
      }
      
      messageIndex++;
    } else {
      clearInterval(interval);
    }
  }, 3000);
  
  return interval;
}

/**
 * Handle client joining a demo call room
 */
async function handleJoinDemoCall(ws, callId, token, isDemoMode = false) {
  try {
    logger.info(`Attempting to join demo call: ${callId}, isDemoMode: ${isDemoMode}, token: ${token}`);

    // For demo calls, we use a simpler verification
    // Accept both 'demo-call-' and 'interactive-demo-' prefixes
    if (!callId || (!callId.startsWith('demo-call-') && !callId.startsWith('interactive-demo-'))) {
      logger.warn(`Invalid demo call ID format: ${callId}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid demo call ID'
      }));
      return;
    }

    // Accept both demo users and authenticated users for demo calls
    if (isDemoMode || token === 'demo-token') {
      logger.info(`Demo user joining demo call: ${callId}`);
    } else {
      // For authenticated users, we could verify the JWT token here
      // For now, we'll allow any token for demo calls
      logger.info(`Authenticated user joining demo call: ${callId}`);
    }

    if (!global.wsClients.has(callId)) {
      global.wsClients.set(callId, []);
    }

    global.wsClients.get(callId).push(ws);

    // Store the callId on the WebSocket for cleanup
    ws.demoCallId = callId;

    ws.send(JSON.stringify({
      type: 'joined_demo_call',
      callId: callId,
      message: 'Successfully joined demo call monitoring',
      isDemoMode: isDemoMode
    }));

    logger.info(`Client joined demo call monitoring for call: ${callId} (demo mode: ${isDemoMode})`);

    // Check if demo call service has this call, create if it doesn't exist
    const demoCallService = require('../services/demoCallService');
    let demoCall = demoCallService.getDemoCall(callId);

    if (!demoCall) {
      // Create new demo call
      demoCall = demoCallService.createDemoCall(callId, {
        isDemoMode: isDemoMode,
        token: token
      });
      logger.info(`Created new demo call: ${callId}`);
    }

    // Add WebSocket connection to demo call service for broadcasting
    demoCallService.addConnection(callId, ws);

    if (demoCall) {
      // Send current transcript if any
      if (demoCall.transcript && demoCall.transcript.length > 0) {
        demoCall.transcript.forEach(entry => {
          ws.send(JSON.stringify({
            type: 'transcript_entry',
            entry: entry
          }));
        });
      }

      // Send current sentiment
      ws.send(JSON.stringify({
        type: 'sentiment_update',
        sentiment: demoCall.currentSentiment
      }));

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'audio_response',
        text: 'Hello! I\'m your AI assistant. How can I help you today?',
        transcriptId: 'welcome-message'
      }));
    }

  } catch (error) {
    logger.error('Error joining demo call:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join demo call'
    }));
  }
}

/**
 * Handle demo call next message request
 */
async function handleDemoCallNextMessage(ws, callId) {
  try {
    // This would typically call the demo call API to get the next message
    // For now, we'll simulate it
    const axios = require('axios');
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    // Get the auth token from the WebSocket connection (simplified for demo)
    // In production, you'd properly extract and verify the JWT token

    logger.info(`Requesting next message for demo call: ${callId}`);

    // Broadcast that a new message is coming
    broadcastToCall(callId, {
      type: 'demo_call_message_incoming',
      callId: callId
    });

  } catch (error) {
    logger.error('Error handling demo call next message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to get next demo message'
    }));
  }
}

/**
 * Handle demo call end request
 */
async function handleEndDemoCall(ws, callId) {
  try {
    logger.info(`Ending demo call: ${callId}`);

    // Broadcast call end to all clients in the room
    broadcastToCall(callId, {
      type: 'demo_call_ended',
      callId: callId,
      timestamp: new Date().toISOString()
    });

    // Clean up the call room
    if (global.wsClients.has(callId)) {
      global.wsClients.delete(callId);
    }

  } catch (error) {
    logger.error('Error ending demo call:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to end demo call'
    }));
  }
}

/**
 * Broadcast demo call transcript update
 */
function broadcastDemoCallTranscript(callId, transcriptEntry, sentimentData) {
  logger.info(`Broadcasting demo transcript for call: ${callId}, speaker: ${transcriptEntry.speaker}`);
  broadcastToCall(callId, {
    type: 'demo_transcript_update',
    callId: callId,
    transcript: transcriptEntry,
    sentiment: sentimentData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast demo call sentiment update
 */
function broadcastDemoCallSentiment(callId, sentimentData) {
  logger.info(`Broadcasting demo sentiment for call: ${callId}, overall: ${sentimentData.overall}`);
  broadcastToCall(callId, {
    type: 'demo_sentiment_update',
    callId: callId,
    sentiment: sentimentData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast voice interaction status update
 */
function broadcastVoiceInteractionStatus(callId, status) {
  logger.info(`Broadcasting voice interaction status for call: ${callId}, status: ${status}`);
  broadcastToCall(callId, {
    type: 'voice_interaction_status',
    callId: callId,
    status, // 'listening', 'processing', 'speaking', 'idle'
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast audio response ready (deprecated - use broadcastAudioStream)
 */
function broadcastAudioResponse(callId, audioUrl, transcriptId) {
  logger.info(`Broadcasting audio response ready for call: ${callId}, audio: ${audioUrl}`);
  broadcastToCall(callId, {
    type: 'audio_response_ready',
    callId: callId,
    audioUrl,
    transcriptId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast audio stream data directly via WebSocket
 */
function broadcastAudioStream(callId, audioBuffer, transcriptId, metadata = {}) {
  logger.info(`Broadcasting audio stream for call: ${callId}, size: ${audioBuffer.length} bytes`);

  const clients = global.wsClients.get(callId);
  if (clients) {
    // Convert audio buffer to base64 for JSON transmission
    const audioBase64 = audioBuffer.toString('base64');

    const message = {
      type: 'audio_stream_data',
      callId: callId,
      audioData: audioBase64,
      transcriptId,
      metadata: {
        format: 'mp3',
        encoding: 'base64',
        size: audioBuffer.length,
        ...metadata
      },
      timestamp: new Date().toISOString()
    };

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

/**
 * Handle voice input from client
 */
async function handleVoiceInput(ws, data) {
  try {
    const { callId, audioData, format = 'webm', audioMetrics = {} } = data;

    logger.info(`Received voice input for call: ${callId}, format: ${format}, size: ${audioData?.length || 0} chars, metrics:`, audioMetrics);

    // Validate input data
    if (!callId) {
      throw new Error('Missing callId in voice input');
    }

    if (!audioData || audioData.length === 0) {
      throw new Error('Missing or empty audioData in voice input');
    }

    // Convert base64 audio data to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    logger.info(`Converted audio buffer: ${audioBuffer.length} bytes`);

    // Process voice input with comprehensive analysis
    const demoCallService = require('../services/demoCallService');
    const result = await demoCallService.processVoiceInput(callId, audioBuffer, format, audioMetrics);

    if (result) {
      // The voice analysis is already broadcasted by the service
      logger.info(`Voice input processed successfully for call: ${callId}, transcription: "${result.transcriptEntry?.text?.substring(0, 50)}..."`);

      // Send success confirmation to client
      ws.send(JSON.stringify({
        type: 'voice_input_processed',
        callId,
        success: true,
        transcriptId: result.transcriptEntry?.id
      }));
    } else {
      logger.warn(`Voice input processing returned null for call: ${callId}`);
      ws.send(JSON.stringify({
        type: 'voice_input_processed',
        callId,
        success: false,
        message: 'Voice processing returned no result'
      }));
    }

  } catch (error) {
    logger.error('Error handling voice input:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to process voice input: ${error.message}`
    }));
  }
}

/**
 * Broadcast comprehensive voice analysis results
 */
function broadcastVoiceAnalysis(callId, analysis) {
  const message = {
    type: 'voice_analysis',
    callId,
    data: {
      ...analysis,
      timestamp: new Date().toISOString()
    }
  };

  broadcastToCall(callId, message);
  logger.info(`Voice analysis broadcasted for call ${callId}: sentiment=${analysis.sentiment.overall}, emotion=${analysis.emotion.primary}`);
}

/**
 * Process audio chunk for real-time transcription
 */
async function processAudioChunkForTranscription(callId, audioChunk, conversation) {
  try {
    // For real-time processing, we'll use a simplified approach
    // In production, you might want to use streaming STT services

    // Accumulate audio chunks for processing
    if (conversation.audioBuffer.length > 10) { // Process every 10 chunks
      const combinedAudio = combineAudioChunks(conversation.audioBuffer.slice(-10));

      // Use voice analysis service for transcription
      const voiceAnalysisService = require('../services/voiceAnalysisService');
      const transcription = await voiceAnalysisService.transcribeAudio(
        Buffer.from(combinedAudio, 'base64'),
        conversation.voiceSettings.format
      );

      if (transcription && transcription.text) {
        // Broadcast interim transcript
        broadcastToCall(callId, {
          type: 'voice_transcript_interim',
          callId,
          transcript: transcription.text,
          confidence: transcription.confidence,
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    logger.error('Error processing audio chunk for transcription:', error);
  }
}

/**
 * Process final audio buffer for complete transcription
 */
async function processFinalAudioBuffer(callId, conversation) {
  try {
    if (conversation.audioBuffer.length === 0) {
      return '';
    }

    const combinedAudio = combineAudioChunks(conversation.audioBuffer);

    // Use voice analysis service for final transcription
    const voiceAnalysisService = require('../services/voiceAnalysisService');
    const transcription = await voiceAnalysisService.transcribeAudio(
      Buffer.from(combinedAudio, 'base64'),
      conversation.voiceSettings.format
    );

    return transcription ? transcription.text : '';
  } catch (error) {
    logger.error('Error processing final audio buffer:', error);
    return '';
  }
}

/**
 * Generate AI voice response
 */
async function generateAIVoiceResponse(callId, userMessage, conversation) {
  try {
    // Use real-time AI service
    const realTimeAIService = require('../services/realTimeAIService');

    // Process user input with AI service
    const aiResult = await realTimeAIService.processUserInput(callId, userMessage, {
      confidence: 0.9,
      metadata: {
        conversationHistory: conversation.conversationHistory
      }
    });

    if (aiResult && aiResult.response) {
      // Add AI response to conversation history
      conversation.conversationHistory.push({
        speaker: 'ai',
        text: aiResult.response,
        timestamp: new Date(),
        confidence: aiResult.confidence,
        intent: aiResult.intent
      });

      // Broadcast AI response
      broadcastToCall(callId, {
        type: 'ai_response_generated',
        callId,
        response: aiResult.response,
        intent: aiResult.intent,
        confidence: aiResult.confidence,
        shouldEscalate: aiResult.shouldEscalate,
        conversationPhase: aiResult.conversationPhase,
        processingTime: aiResult.processingTime,
        timestamp: new Date().toISOString()
      });

      // Generate TTS audio using real-time TTS service
      await generateTTSAudioRealTime(callId, aiResult.response);
    }
  } catch (error) {
    logger.error('Error generating AI voice response:', error);

    // Broadcast error to client
    broadcastToCall(callId, {
      type: 'ai_response_error',
      callId,
      error: 'Failed to generate AI response',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Generate TTS audio using real-time TTS service
 */
async function generateTTSAudioRealTime(callId, text) {
  try {
    const realTimeTTSService = require('../services/realTimeTTSService');

    // Initialize TTS for this call if not already done
    if (!realTimeTTSService.voiceSettings.has(callId)) {
      realTimeTTSService.initializeTTS(callId, {
        streaming: true,
        voiceId: process.env.ELEVENLABS_VOICE_ID
      });
    }

    // Set up audio chunk streaming
    realTimeTTSService.on('audioChunk', (chunkData) => {
      if (chunkData.callId === callId) {
        // Broadcast audio chunk for streaming playback
        broadcastToCall(callId, {
          type: 'ai_audio_chunk',
          callId,
          chunkIndex: chunkData.chunkIndex,
          audioChunk: chunkData.chunk.toString('base64'),
          contentType: chunkData.contentType,
          isLast: chunkData.isLast,
          totalChunks: chunkData.totalChunks,
          timestamp: chunkData.timestamp
        });
      }
    });

    // Generate speech with streaming
    const audioResult = await realTimeTTSService.generateSpeech(callId, text, {
      streaming: true
    });

    if (audioResult) {
      // Broadcast complete audio response
      broadcastToCall(callId, {
        type: 'ai_audio_response',
        callId,
        generationId: audioResult.generationId,
        audioData: audioResult.audioData ? audioResult.audioData.toString('base64') : null,
        contentType: audioResult.contentType,
        text: text,
        duration: audioResult.duration,
        streaming: audioResult.streaming,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    logger.error('Error generating real-time TTS audio:', error);

    // Fallback: broadcast text-only response
    broadcastToCall(callId, {
      type: 'ai_text_response',
      callId,
      text: text,
      error: 'TTS generation failed',
      timestamp: Date.now()
    });
  }
}

/**
 * Generate TTS audio for AI response (legacy method for compatibility)
 */
async function generateTTSAudio(callId, text) {
  return generateTTSAudioRealTime(callId, text);
}

/**
 * Combine audio chunks into a single buffer
 */
function combineAudioChunks(audioChunks) {
  try {
    // Simple concatenation - in production, you might need more sophisticated audio processing
    return audioChunks.map(chunk => chunk.chunk).join('');
  } catch (error) {
    logger.error('Error combining audio chunks:', error);
    return '';
  }
}

/**
 * Handle start of real-time voice conversation
 */
async function handleStartVoiceConversation(ws, data) {
  try {
    const { callId, voiceSettings = {} } = data;

    logger.info(`Starting voice conversation for call: ${callId}`);

    // Initialize voice conversation state
    if (!global.voiceConversations) {
      global.voiceConversations = new Map();
    }

    const conversationState = {
      callId,
      isActive: true,
      startTime: new Date(),
      currentSpeaker: null,
      audioBuffer: [],
      transcriptionBuffer: '',
      conversationHistory: [],
      voiceSettings: {
        sampleRate: voiceSettings.sampleRate || 16000,
        channels: voiceSettings.channels || 1,
        format: voiceSettings.format || 'webm',
        ...voiceSettings
      }
    };

    global.voiceConversations.set(callId, conversationState);

    // Store WebSocket reference for this conversation
    ws.voiceCallId = callId;

    ws.send(JSON.stringify({
      type: 'voice_conversation_started',
      callId,
      message: 'Real-time voice conversation initialized',
      voiceSettings: conversationState.voiceSettings
    }));

    logger.info(`Voice conversation started for call: ${callId}`);
  } catch (error) {
    logger.error('Error starting voice conversation:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to start voice conversation'
    }));
  }
}

/**
 * Handle voice stream chunks for real-time processing
 */
async function handleVoiceStreamChunk(ws, data) {
  try {
    const { callId, audioChunk, sequenceNumber, timestamp } = data;

    if (!global.voiceConversations || !global.voiceConversations.has(callId)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Voice conversation not found'
      }));
      return;
    }

    const conversation = global.voiceConversations.get(callId);

    // Add audio chunk to buffer
    conversation.audioBuffer.push({
      chunk: audioChunk,
      sequence: sequenceNumber,
      timestamp: timestamp || Date.now()
    });

    // Process audio chunk for real-time transcription
    await processAudioChunkForTranscription(callId, audioChunk, conversation);

    // Broadcast voice activity to other clients
    broadcastToCall(callId, {
      type: 'voice_activity_update',
      callId,
      isReceiving: true,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error handling voice stream chunk:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process voice stream chunk'
    }));
  }
}

/**
 * Handle end of voice stream
 */
async function handleEndVoiceStream(ws, data) {
  try {
    const { callId, finalTranscript } = data;

    if (!global.voiceConversations || !global.voiceConversations.has(callId)) {
      return;
    }

    const conversation = global.voiceConversations.get(callId);

    // Process final audio buffer for complete transcription
    const completeTranscript = finalTranscript || await processFinalAudioBuffer(callId, conversation);

    if (completeTranscript && completeTranscript.trim()) {
      // Add to conversation history
      conversation.conversationHistory.push({
        speaker: 'user',
        text: completeTranscript,
        timestamp: new Date(),
        confidence: 0.9
      });

      // Broadcast transcript update
      broadcastToCall(callId, {
        type: 'voice_transcript_update',
        callId,
        transcript: completeTranscript,
        speaker: 'user',
        timestamp: new Date().toISOString(),
        isFinal: true
      });

      // Generate AI response
      await generateAIVoiceResponse(callId, completeTranscript, conversation);
    }

    // Clear audio buffer
    conversation.audioBuffer = [];
    conversation.currentSpeaker = null;

    // Broadcast end of voice stream
    broadcastToCall(callId, {
      type: 'voice_stream_ended',
      callId,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error handling end voice stream:', error);
  }
}

/**
 * Handle voice activity detection
 */
async function handleVoiceActivityDetected(ws, data) {
  try {
    const { callId, isActive, confidence } = data;

    if (!global.voiceConversations || !global.voiceConversations.has(callId)) {
      return;
    }

    const conversation = global.voiceConversations.get(callId);

    if (isActive) {
      conversation.currentSpeaker = 'user';
    } else {
      conversation.currentSpeaker = null;
    }

    // Broadcast voice activity to all clients
    broadcastToCall(callId, {
      type: 'voice_activity_detected',
      callId,
      isActive,
      confidence,
      speaker: isActive ? 'user' : null,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error handling voice activity detection:', error);
  }
}

module.exports = {
  initializeWebSocketServer,
  broadcastToCall,
  simulateTranscriptUpdates,
  handleJoinDemoCall,
  handleDemoCallNextMessage,
  handleEndDemoCall,
  broadcastDemoCallTranscript,
  broadcastDemoCallSentiment,
  broadcastVoiceInteractionStatus,
  broadcastAudioResponse,
  broadcastAudioStream,
  handleVoiceInput,
  broadcastVoiceAnalysis,
  handleStartVoiceConversation,
  handleVoiceStreamChunk,
  handleEndVoiceStream,
  handleVoiceActivityDetected
};
