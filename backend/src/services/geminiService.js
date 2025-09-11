const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

// Module state
let genAI = null;
let model = null;

/**
 * Initialize Gemini AI service
 */
const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required');
  }
  
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  logger.info('Gemini AI service initialized');
};

/**
 * Process customer query using Gemini AI
 */
const processCustomerQuery = async (query, context = {}) => {
  try {
    if (!model) {
      initializeGemini();
    }
    
    const prompt = buildPrompt(query, context);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    logger.info(`Gemini processed query: ${query.substring(0, 50)}...`);
    
    return {
      response: text,
      intent: extractIntent(text),
      confidence: calculateConfidence(text),
      shouldEscalate: shouldEscalateToHuman(text, query)
    };
  } catch (error) {
    logger.error(`Gemini service error: ${error.message}`);
    throw new Error('Failed to process customer query');
  }
};

/**
 * Build prompt for Gemini AI
 */
const buildPrompt = (query, context) => {
  const systemPrompt = `You are VoxAssist, a helpful AI customer support agent. 
  
  Your role:
  - Provide accurate, helpful responses to customer queries
  - Be empathetic and professional
  - If you cannot help, clearly state that you'll escalate to a human agent
  - Keep responses concise but complete
  - Always aim to resolve the customer's issue
  
  Context: ${JSON.stringify(context)}
  
  Customer Query: ${query}
  
  Provide a helpful response:`;
  
  return systemPrompt;
};

/**
 * Extract intent from response
 */
const extractIntent = (response) => {
  // Simple intent extraction - can be enhanced with more sophisticated NLP
  const intents = {
    'billing': ['bill', 'charge', 'payment', 'invoice', 'cost'],
    'technical': ['not working', 'error', 'bug', 'broken', 'issue'],
    'account': ['account', 'login', 'password', 'profile', 'settings'],
    'general': ['help', 'information', 'how to', 'what is'],
    'escalation': ['manager', 'human', 'person', 'speak to someone']
  };

  const lowerResponse = response.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => lowerResponse.includes(keyword))) {
      return intent;
    }
  }
  
  return 'general';
};

/**
 * Calculate confidence score for response
 */
const calculateConfidence = (response) => {
  // Simple confidence calculation based on response characteristics
  if (response.includes('I don\'t know') || response.includes('uncertain')) {
    return 0.3;
  }
  if (response.includes('escalate') || response.includes('human agent')) {
    return 0.5;
  }
  if (response.length > 50 && !response.includes('sorry')) {
    return 0.9;
  }
  return 0.7;
};

/**
 * Determine if query should be escalated to human
 */
const shouldEscalateToHuman = (response, query) => {
  const escalationTriggers = [
    'escalate',
    'human agent',
    'speak to someone',
    'manager',
    'I don\'t know',
    'cannot help',
    'complex issue'
  ];
  
  const lowerResponse = response.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  return escalationTriggers.some(trigger => 
    lowerResponse.includes(trigger) || lowerQuery.includes(trigger)
  );
};

/**
 * Generate follow-up questions based on conversation
 */
const generateFollowUpQuestions = async (conversation) => {
  try {
    if (!model) {
      initializeGemini();
    }
    
    const prompt = `Based on this customer conversation, suggest 2-3 relevant follow-up questions to better understand their needs:
    
    Conversation: ${JSON.stringify(conversation)}
    
    Provide follow-up questions as a JSON array:`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    try {
      return JSON.parse(text);
    } catch {
      return ['How can I further assist you?', 'Is there anything else I can help with?'];
    }
  } catch (error) {
    logger.error(`Error generating follow-up questions: ${error.message}`);
    return ['How can I further assist you?'];
  }
};

// Initialize on module load
initializeGemini();

// Export all functions
module.exports = {
  initializeGemini,
  processCustomerQuery,
  buildPrompt,
  extractIntent,
  calculateConfidence,
  shouldEscalateToHuman,
  generateFollowUpQuestions
};
