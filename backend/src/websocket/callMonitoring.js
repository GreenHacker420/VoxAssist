const WebSocket = require('ws');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../database/prisma');

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
    
    if (!global.wsClients.has(callId)) {
      global.wsClients.set(callId, []);
    }
    
    global.wsClients.get(callId).push(ws);
    
    ws.send(JSON.stringify({
      type: 'joined_call',
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

module.exports = {
  initializeWebSocketServer,
  broadcastToCall,
  simulateTranscriptUpdates
};
