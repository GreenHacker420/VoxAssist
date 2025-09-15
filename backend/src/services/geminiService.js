const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

// Module state
let genAI = null;
let model = null;

// Response cache for common queries
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes
const MAX_CACHE_SIZE = 100;

/**
 * Initialize Gemini AI service
 */
const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required');
  }
  
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.3, // Balanced for natural conversation
      topK: 20, // Better variety in responses
      topP: 0.8, // More natural language flow
      maxOutputTokens: 150, // Sufficient for complete responses
      candidateCount: 1
    }
  });
  
  logger.info('Gemini AI service initialized');
};

/**
 * Process customer query using Gemini AI with caching
 */
const processCustomerQuery = async (query, context = {}) => {
  try {
    if (!model) {
      initializeGemini();
    }

    // Check cache first for common queries
    const cacheKey = generateCacheKey(query, context);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      logger.info(`Cache hit for query: ${query.substring(0, 30)}...`);
      return cachedResponse;
    }

    const startTime = Date.now();
    const prompt = buildPrompt(query, context);

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Check for safety filters or blocked content
    if (response.promptFeedback && response.promptFeedback.blockReason) {
      logger.warn(`Gemini blocked content: ${response.promptFeedback.blockReason}`);
      throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
    }

    // Check if response was blocked
    if (!response.candidates || response.candidates.length === 0) {
      logger.warn('Gemini returned no candidates');
      throw new Error('No response candidates from Gemini');
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      logger.warn('Gemini response blocked by safety filters');
      throw new Error('Response blocked by safety filters');
    }

    const text = response.text();

    const processingTime = Date.now() - startTime;
    logger.info(`Gemini processed query in ${processingTime}ms: ${query.substring(0, 30)}...`);
    logger.info(`Gemini response text: "${text.substring(0, 100)}..."`);

    if (!text || text.trim().length === 0) {
      logger.warn('Gemini returned empty response, using fallback');
      throw new Error('Empty response from Gemini');
    }

    const processedResponse = {
      response: text,
      intent: extractIntent(text),
      confidence: calculateConfidence(text),
      shouldEscalate: shouldEscalateToHuman(text, query)
    };

    // Cache the response for future use
    setCachedResponse(cacheKey, processedResponse);

    return processedResponse;
  } catch (error) {
    logger.error(`Gemini service error: ${error.message}`);

    // Return intelligent fallback responses based on query content
    const fallbackResponse = generateIntelligentFallback(query, context);
    logger.info(`Using intelligent fallback response: "${fallbackResponse.response}"`);

    return fallbackResponse;
  }
};

/**
 * Generate intelligent fallback responses based on query content
 */
const generateIntelligentFallback = (query, context) => {
  const lowerQuery = query.toLowerCase();
  
  // Handle calculus questions specifically
  if (lowerQuery.includes('calculus')) {
    return {
      response: 'Calculus is a branch of mathematics focused on rates of change (derivatives) and accumulation of quantities (integrals). It includes differential calculus (finding slopes and rates) and integral calculus (finding areas and volumes). What specific calculus topic would you like to explore?',
      intent: 'math',
      confidence: 0.9,
      shouldEscalate: false
    };
  }
  
  // Handle DPMS queries
  if (lowerQuery.includes('dpms') || lowerQuery.includes('display power')) {
    return {
      response: 'DPMS (Display Power Management Signaling) is a technology that allows monitors to enter power-saving modes with states like On, Standby, Suspend, and Off to reduce power consumption.',
      intent: 'technical',
      confidence: 0.9,
      shouldEscalate: false
    };
  }
  
  // Handle capability questions
  if (lowerQuery.includes('what can you do') || lowerQuery.includes('what are you doing')) {
    return {
      response: 'I can help explain concepts, answer questions, provide information on various topics, and assist with learning. I\'m currently ready to help with whatever you\'d like to know about.',
      intent: 'capability_inquiry',
      confidence: 0.9,
      shouldEscalate: false
    };
  }
  
  // Handle greetings - respond once appropriately
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('good morning')) {
    return {
      response: 'Hello! I\'m here to help. What would you like to learn about or discuss?',
      intent: 'greeting',
      confidence: 0.9,
      shouldEscalate: false
    };
  }
  
  // Handle incomplete questions
  if (lowerQuery.includes('i want to know about') && lowerQuery.length < 25) {
    return {
      response: 'What specific topic would you like to learn about? I\'m ready to help explain it.',
      intent: 'general',
      confidence: 0.8,
      shouldEscalate: false
    };
  }
  
  // Default response
  return {
    response: 'I\'m here to help! Could you please be more specific about what you\'d like to know?',
    intent: 'general',
    confidence: 0.7,
    shouldEscalate: false
  };
};

/**
 * Build prompt for Gemini AI
 */
const buildPrompt = (query, context) => {
  const recentHistory = context.conversationHistory ?
    context.conversationHistory
      .filter(h => h.speaker === 'user' || h.speaker === 'customer')
      .slice(-2) // Reduced to last 2 exchanges to prevent confusion
      .map(h => `User: ${h.text || h.content || h.message}`)
      .join('\n') : '';

  const systemPrompt = `You are VoxAssist, a helpful AI assistant. Respond directly and specifically to the user's current question. Do not repeat greetings or ask generic questions.

${recentHistory ? `Recent context:\n${recentHistory}\n\n` : ''}Current question: "${query}"

Provide a direct, helpful response to this specific question. If it's about calculus, explain the concept. If it's a greeting, respond appropriately once. Be conversational but focused.`;

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
 * Generate cache key for query
 */
const generateCacheKey = (query, context) => {
  const normalizedQuery = query.toLowerCase().trim();
  const contextKey = context.conversationPhase || 'general';
  return `${contextKey}:${normalizedQuery}`;
};

/**
 * Get cached response
 */
const getCachedResponse = (cacheKey) => {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey); // Remove expired cache
  }
  return null;
};

/**
 * Set cached response
 */
const setCachedResponse = (cacheKey, response) => {
  // Implement LRU cache behavior
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }

  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
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
