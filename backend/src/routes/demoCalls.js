const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const realTimeAIService = require('../services/realTimeAIService');

// Demo call storage (in-memory for simplicity)
const demoCalls = new Map();

// Start a demo call
router.post('/demo/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const demoCall = {
      id: `demo-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      customerName: 'Demo Customer',
      customerEmail: 'demo@example.com',
      customerPhone: '+1-555-DEMO',
      status: 'active',
      startTime: new Date().toISOString(),
      sentiment: 'neutral',
      sentimentScore: 0.5,
      callSid: `demo-sid-${Date.now()}`,
      transcript: '',
      aiInsights: 'Demo call in progress'
    };

    demoCalls.set(demoCall.id, demoCall);

    res.json({
      success: true,
      data: demoCall
    });
  } catch (error) {
    console.error('Error starting demo call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start demo call',
      details: error.message
    });
  }
});

// End a demo call
router.post('/demo/:callId/end', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to end this demo call'
      });
    }

    // Update call status
    demoCall.status = 'completed';
    demoCall.endTime = new Date().toISOString();
    demoCall.duration = Math.floor((new Date() - new Date(demoCall.startTime)) / 1000);

    demoCalls.set(callId, demoCall);

    res.json({
      success: true,
      data: demoCall
    });
  } catch (error) {
    console.error('Error ending demo call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end demo call',
      details: error.message
    });
  }
});

// Process voice input for demo call
router.post('/demo/:callId/voice', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    // Parse analysis data
    let analysis = {};
    try {
      analysis = JSON.parse(req.body.analysis || '{}');
    } catch (e) {
      analysis = {};
    }

    // Simulate voice processing
    const mockTranscript = generateMockTranscript(analysis);
    const mockSentiment = generateMockSentiment(analysis);
    const mockAiResponse = generateMockAiResponse(mockTranscript);

    // Update demo call with new data
    const transcriptEntry = {
      speaker: 'customer',
      text: mockTranscript,
      timestamp: new Date().toISOString(),
      sentiment: mockSentiment.overall,
      confidence: analysis.confidence || 0.8
    };

    // Store transcript (simple string for now)
    demoCall.transcript += `Customer: ${mockTranscript}\n`;
    demoCall.sentiment = mockSentiment.overall;
    demoCall.sentimentScore = mockSentiment.score;

    demoCalls.set(callId, demoCall);

    res.json({
      success: true,
      data: {
        transcript: mockTranscript,
        confidence: analysis.confidence || 0.8,
        sentiment: mockSentiment.overall,
        sentimentData: mockSentiment,
        aiResponse: mockAiResponse
      }
    });
  } catch (error) {
    console.error('Error processing voice input:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice input',
      details: error.message
    });
  }
});

// Get demo call details
router.get('/demo/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    res.json({
      success: true,
      data: demoCall
    });
  } catch (error) {
    console.error('Error fetching demo call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch demo call',
      details: error.message
    });
  }
});

// Reset conversation context for demo call
router.post('/:callId/reset-context', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    // Reset conversation context in AI service
    realTimeAIService.resetConversationContext(callId);

    // Reset demo call transcript and context
    demoCall.transcript = '';
    demoCall.sentiment = 'neutral';
    demoCall.sentimentScore = 0.5;
    demoCall.aiInsights = 'Fresh conversation started';

    demoCalls.set(callId, demoCall);

    res.json({
      success: true,
      data: {
        callId,
        voiceInteractionEnabled: true,
        message: 'Conversation context reset successfully'
      }
    });
  } catch (error) {
    console.error('Error resetting conversation context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset conversation context',
      details: error.message
    });
  }
});

// Enable voice interaction for demo call
router.post('/:callId/enable-voice', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    // Initialize conversation in AI service
    realTimeAIService.initializeConversation(callId, {
      userProfile: { userId },
      callMetadata: { callType: 'demo', callId }
    });

    res.json({
      success: true,
      data: {
        callId,
        voiceInteractionEnabled: true,
        message: 'Voice interaction enabled successfully'
      }
    });
  } catch (error) {
    console.error('Error enabling voice interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable voice interaction',
      details: error.message
    });
  }
});

// Disable voice interaction for demo call
router.post('/:callId/disable-voice', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    // End conversation in AI service
    realTimeAIService.endConversation(callId);

    res.json({
      success: true,
      data: {
        callId,
        voiceInteractionEnabled: false,
        message: 'Voice interaction disabled successfully'
      }
    });
  } catch (error) {
    console.error('Error disabling voice interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable voice interaction',
      details: error.message
    });
  }
});

// Process speech for demo call
router.post('/:callId/speech', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { transcript, isInterim = false } = req.body;
    const userId = req.user.id;

    const demoCall = demoCalls.get(callId);
    if (!demoCall) {
      return res.status(404).json({
        success: false,
        error: 'Demo call not found'
      });
    }

    if (demoCall.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this demo call'
      });
    }

    if (!transcript || isInterim) {
      return res.json({
        success: true,
        data: {
          callId,
          customerTranscript: transcript || '',
          isProcessing: false,
          isInterim: true
        }
      });
    }

    // Process with AI service
    const aiResponse = await realTimeAIService.processUserInput(callId, transcript, {
      confidence: 0.9,
      metadata: { source: 'demo_call' }
    });

    // Update demo call transcript
    demoCall.transcript += `Customer: ${transcript}\nAI: ${aiResponse.response}\n`;
    demoCalls.set(callId, demoCall);

    res.json({
      success: true,
      data: {
        callId,
        customerTranscript: transcript,
        aiResponse: aiResponse.response,
        sentiment: {
          overall: aiResponse.conversationPhase === 'greeting' ? 'positive' : 'neutral',
          score: aiResponse.confidence,
          emotions: {}
        },
        isProcessing: false,
        transcriptId: `transcript-${Date.now()}`
      }
    });
  } catch (error) {
    console.error('Error processing speech:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process speech',
      details: error.message
    });
  }
});

// Helper functions for mock data generation
function generateMockTranscript(analysis) {
  const mockPhrases = [
    "Hello, I need help with my account",
    "Can you help me with billing questions?",
    "I'm having trouble with my order",
    "What are your business hours?",
    "I'd like to speak to a manager",
    "Thank you for your help",
    "Can you explain this charge?",
    "I need to update my information"
  ];

  // Use emotion to influence phrase selection
  let selectedPhrases = mockPhrases;
  if (analysis.emotion === 'angry') {
    selectedPhrases = [
      "I'm very frustrated with this service",
      "This is completely unacceptable",
      "I want to speak to your manager now",
      "Why is this so difficult?"
    ];
  } else if (analysis.emotion === 'happy') {
    selectedPhrases = [
      "Thank you so much for your help",
      "This is exactly what I needed",
      "You've been very helpful",
      "I appreciate your assistance"
    ];
  }

  return selectedPhrases[Math.floor(Math.random() * selectedPhrases.length)];
}

function generateMockSentiment(analysis) {
  // Base sentiment on voice analysis emotion
  let overall = 'neutral';
  let score = 0.5;

  switch (analysis.emotion) {
    case 'happy':
    case 'excited':
      overall = 'positive';
      score = 0.7 + Math.random() * 0.3;
      break;
    case 'angry':
    case 'sad':
      overall = 'negative';
      score = Math.random() * 0.4;
      break;
    default:
      overall = 'neutral';
      score = 0.4 + Math.random() * 0.2;
  }

  return {
    overall,
    score,
    emotions: {
      joy: analysis.emotion === 'happy' ? 0.8 : 0.2,
      anger: analysis.emotion === 'angry' ? 0.8 : 0.1,
      fear: analysis.emotion === 'sad' ? 0.6 : 0.1,
      sadness: analysis.emotion === 'sad' ? 0.7 : 0.1,
      surprise: analysis.emotion === 'excited' ? 0.7 : 0.1
    }
  };
}

function generateMockAiResponse(transcript) {
  const responses = {
    'account': "I'd be happy to help you with your account. Let me look that up for you.",
    'billing': "I can assist you with billing questions. What specific information do you need?",
    'order': "Let me check on your order status. Can you provide your order number?",
    'hours': "Our business hours are Monday through Friday, 9 AM to 6 PM EST.",
    'manager': "I understand you'd like to speak with a manager. Let me connect you right away.",
    'help': "Thank you for contacting us. How can I assist you today?",
    'charge': "I can help explain any charges on your account. Let me review that for you.",
    'update': "I can help you update your information. What would you like to change?"
  };

  // Simple keyword matching for response selection
  const lowerTranscript = transcript.toLowerCase();
  for (const [keyword, response] of Object.entries(responses)) {
    if (lowerTranscript.includes(keyword)) {
      return response;
    }
  }

  return "I understand. Let me help you with that. Can you provide more details?";
}

module.exports = router;
