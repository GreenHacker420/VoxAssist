const logger = require('../utils/logger');
const geminiService = require('./geminiService');
const db = require('../database/connection');

/**
 * Emotion Detection and Voice Biometrics Service - Functional Version
 * Analyzes emotional state and voice characteristics from audio and text
 */

// Module state
let emotionModels = {
  textEmotion: { initialized: false },
  voiceEmotion: { initialized: false },
  voiceBiometrics: { initialized: false }
};

let emotionCache = new Map();
let biometricProfiles = new Map();

// Emotion categories and their indicators
const emotionCategories = {
  joy: ['happy', 'excited', 'pleased', 'satisfied', 'delighted'],
  anger: ['angry', 'frustrated', 'annoyed', 'irritated', 'furious'],
  sadness: ['sad', 'disappointed', 'upset', 'depressed', 'unhappy'],
  fear: ['worried', 'anxious', 'concerned', 'nervous', 'scared'],
  surprise: ['surprised', 'amazed', 'shocked', 'astonished'],
  disgust: ['disgusted', 'revolted', 'appalled'],
  neutral: ['calm', 'neutral', 'normal', 'stable']
};

/**
 * Initialize emotion detection models
 */
const initializeEmotionDetection = async () => {
  try {
    logger.info('Initializing emotion detection models');
    
    // In production, load pre-trained emotion detection models
    emotionModels.textEmotion.initialized = true;
    emotionModels.voiceEmotion.initialized = true;
    emotionModels.voiceBiometrics.initialized = true;
    
    logger.info('Emotion detection models initialized');
  } catch (error) {
    logger.error('Error initializing emotion detection:', error);
    throw error;
  }
};

/**
 * Analyze emotion from text transcript
 */
const analyzeTextEmotion = async (text, callId = null) => {
  try {
    if (!text || text.trim().length === 0) {
      return { emotion: 'neutral', confidence: 0.5, indicators: [] };
    }

    // Check cache first
    const cacheKey = `text_${text.substring(0, 100)}`;
    if (emotionCache.has(cacheKey)) {
      return emotionCache.get(cacheKey);
    }

    // Use AI for sophisticated emotion analysis
    const emotionPrompt = `
      Analyze the emotional content of this customer service conversation text:
      
      "${text}"
      
      Identify the primary emotion and provide:
      1. Primary emotion (joy, anger, sadness, fear, surprise, disgust, neutral)
      2. Confidence score (0.0 to 1.0)
      3. Secondary emotions if present
      4. Emotional intensity (low, medium, high)
      5. Key phrases that indicate the emotion
      6. Emotional progression if the text is long
      
      Return JSON format:
      {
        "primaryEmotion": "emotion_name",
        "confidence": 0.0-1.0,
        "secondaryEmotions": ["emotion1", "emotion2"],
        "intensity": "low|medium|high",
        "indicators": ["phrase1", "phrase2"],
        "emotionalProgression": ["start_emotion", "end_emotion"],
        "sentiment": "positive|negative|neutral"
      }
    `;

    const aiResponse = await geminiService.processCustomerQuery(emotionPrompt);
    
    let emotionAnalysis;
    try {
      emotionAnalysis = JSON.parse(aiResponse.response);
    } catch (parseError) {
      // Fallback to rule-based analysis
      emotionAnalysis = performRuleBasedEmotionAnalysis(text);
    }

    // Enhance with additional analysis
    const enhancedAnalysis = {
      ...emotionAnalysis,
      timestamp: new Date(),
      callId,
      textLength: text.length,
      wordCount: text.split(' ').length
    };

    // Cache the result
    emotionCache.set(cacheKey, enhancedAnalysis);
    
    // Clean cache if it gets too large
    if (emotionCache.size > 1000) {
      const firstKey = emotionCache.keys().next().value;
      emotionCache.delete(firstKey);
    }

    // Save to database if callId provided
    if (callId) {
      await saveEmotionAnalysis(callId, 'text', enhancedAnalysis);
    }

    return enhancedAnalysis;

  } catch (error) {
    logger.error('Error analyzing text emotion:', error);
    return { emotion: 'neutral', confidence: 0.3, error: error.message };
  }
};

/**
 * Analyze emotion from voice audio characteristics
 */
const analyzeVoiceEmotion = async (audioData, callId = null) => {
  try {
    // In production, use audio processing libraries like librosa, pyAudio, etc.
    // For now, simulate voice emotion analysis
    
    const voiceFeatures = extractVoiceFeatures(audioData);
    const emotionAnalysis = analyzeVoiceFeatures(voiceFeatures);

    const analysis = {
      ...emotionAnalysis,
      timestamp: new Date(),
      callId,
      audioLength: audioData?.length || 0,
      features: voiceFeatures
    };

    // Save to database if callId provided
    if (callId) {
      await saveEmotionAnalysis(callId, 'voice', analysis);
    }

    return analysis;

  } catch (error) {
    logger.error('Error analyzing voice emotion:', error);
    return { emotion: 'neutral', confidence: 0.3, error: error.message };
  }
};

/**
 * Extract voice biometric features
 */
const extractVoiceBiometrics = async (audioData, customerId = null) => {
  try {
    // In production, extract actual biometric features:
    // - Fundamental frequency (F0)
    // - Formant frequencies
    // - Spectral features
    // - Prosodic features
    // - Voice quality measures
    
    const biometricFeatures = {
      fundamentalFrequency: simulateF0Analysis(audioData),
      formants: simulateFormantAnalysis(audioData),
      spectralFeatures: simulateSpectralAnalysis(audioData),
      prosodicFeatures: simulateProsodicAnalysis(audioData),
      voiceQuality: simulateVoiceQualityAnalysis(audioData),
      timestamp: new Date(),
      customerId
    };

    // Create voice fingerprint
    const voiceFingerprint = createVoiceFingerprint(biometricFeatures);
    biometricFeatures.fingerprint = voiceFingerprint;

    // Store or update biometric profile
    if (customerId) {
      await updateBiometricProfile(customerId, biometricFeatures);
    }

    return biometricFeatures;

  } catch (error) {
    logger.error('Error extracting voice biometrics:', error);
    throw error;
  }
};

/**
 * Verify speaker identity using voice biometrics
 */
const verifyVoiceIdentity = async (audioData, customerId) => {
  try {
    // Extract features from current audio
    const currentFeatures = await extractVoiceBiometrics(audioData);
    
    // Get stored biometric profile
    const storedProfile = await getBiometricProfile(customerId);
    
    if (!storedProfile) {
      return {
        verified: false,
        confidence: 0,
        reason: 'No biometric profile found for customer'
      };
    }

    // Compare biometric features
    const similarity = calculateBiometricSimilarity(currentFeatures, storedProfile);
    const threshold = 0.75; // 75% similarity threshold
    
    const verification = {
      verified: similarity >= threshold,
      confidence: similarity,
      threshold,
      timestamp: new Date(),
      customerId,
      features: {
        current: currentFeatures.fingerprint,
        stored: storedProfile.fingerprint
      }
    };

    // Log verification attempt
    await logVerificationAttempt(customerId, verification);

    return verification;

  } catch (error) {
    logger.error('Error verifying voice identity:', error);
    throw error;
  }
};

/**
 * Detect emotional state changes during conversation
 */
const trackEmotionalJourney = async (callId, textSegments, audioSegments = []) => {
  try {
    const emotionalJourney = [];
    
    // Analyze each text segment
    for (let i = 0; i < textSegments.length; i++) {
      const segment = textSegments[i];
      const emotion = await analyzeTextEmotion(segment.text, callId);
      
      emotionalJourney.push({
        timestamp: segment.timestamp,
        segmentIndex: i,
        type: 'text',
        emotion: emotion.primaryEmotion,
        confidence: emotion.confidence,
        intensity: emotion.intensity,
        indicators: emotion.indicators
      });
    }

    // Analyze emotional transitions
    const transitions = analyzeEmotionalTransitions(emotionalJourney);
    
    // Generate insights
    const insights = generateEmotionalInsights(emotionalJourney, transitions);

    const journey = {
      callId,
      segments: emotionalJourney,
      transitions,
      insights,
      summary: {
        dominantEmotion: findDominantEmotion(emotionalJourney),
        emotionalStability: calculateEmotionalStability(emotionalJourney),
        escalationRisk: assessEscalationRisk(emotionalJourney)
      }
    };

    // Save emotional journey
    await saveEmotionalJourney(callId, journey);

    return journey;

  } catch (error) {
    logger.error('Error tracking emotional journey:', error);
    throw error;
  }
};

/**
 * Generate emotion-based recommendations
 */
const generateEmotionBasedRecommendations = async (emotionAnalysis, callContext) => {
  try {
    const recommendations = [];

    // Anger management
    if (emotionAnalysis.primaryEmotion === 'anger' && emotionAnalysis.confidence > 0.7) {
      recommendations.push({
        type: 'de-escalation',
        priority: 'high',
        action: 'Use calming language and acknowledge frustration',
        script: "I understand your frustration, and I'm here to help resolve this issue for you."
      });
    }

    // Sadness/disappointment
    if (emotionAnalysis.primaryEmotion === 'sadness' && emotionAnalysis.confidence > 0.6) {
      recommendations.push({
        type: 'empathy',
        priority: 'medium',
        action: 'Show empathy and provide reassurance',
        script: "I'm sorry to hear about this situation. Let me see what I can do to help make this right."
      });
    }

    // Fear/anxiety
    if (emotionAnalysis.primaryEmotion === 'fear' && emotionAnalysis.confidence > 0.6) {
      recommendations.push({
        type: 'reassurance',
        priority: 'medium',
        action: 'Provide clear explanations and reassurance',
        script: "I want to assure you that we'll take care of this. Let me explain exactly what we'll do."
      });
    }

    // High intensity emotions
    if (emotionAnalysis.intensity === 'high') {
      recommendations.push({
        type: 'escalation',
        priority: 'high',
        action: 'Consider human agent handoff',
        reason: 'High emotional intensity detected'
      });
    }

    // Positive emotions
    if (emotionAnalysis.primaryEmotion === 'joy' && emotionAnalysis.confidence > 0.7) {
      recommendations.push({
        type: 'reinforcement',
        priority: 'low',
        action: 'Reinforce positive experience',
        script: "I'm glad I could help! Is there anything else I can assist you with today?"
      });
    }

    return recommendations;

  } catch (error) {
    logger.error('Error generating emotion-based recommendations:', error);
    return [];
  }
};

// Helper functions

const performRuleBasedEmotionAnalysis = (text) => {
  const lowerText = text.toLowerCase();
  const emotions = {};

  // Count emotion indicators
  Object.keys(emotionCategories).forEach(emotion => {
    emotions[emotion] = 0;
    emotionCategories[emotion].forEach(indicator => {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        emotions[emotion] += matches.length;
      }
    });
  });

  // Find primary emotion
  const primaryEmotion = Object.keys(emotions).reduce((a, b) => 
    emotions[a] > emotions[b] ? a : b
  );

  const totalIndicators = Object.values(emotions).reduce((sum, count) => sum + count, 0);
  const confidence = totalIndicators > 0 ? emotions[primaryEmotion] / totalIndicators : 0.5;

  return {
    primaryEmotion: primaryEmotion || 'neutral',
    confidence: Math.min(confidence, 0.9),
    secondaryEmotions: [],
    intensity: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
    indicators: emotionCategories[primaryEmotion] || [],
    sentiment: ['joy'].includes(primaryEmotion) ? 'positive' : 
               ['anger', 'sadness', 'fear', 'disgust'].includes(primaryEmotion) ? 'negative' : 'neutral'
  };
};

const extractVoiceFeatures = (audioData) => {
  // Simulate voice feature extraction
  return {
    pitch: Math.random() * 200 + 100, // 100-300 Hz
    energy: Math.random() * 0.8 + 0.2, // 0.2-1.0
    spectralCentroid: Math.random() * 2000 + 1000, // 1000-3000 Hz
    zeroCrossingRate: Math.random() * 0.1 + 0.05, // 0.05-0.15
    mfcc: Array.from({length: 13}, () => Math.random() * 2 - 1) // -1 to 1
  };
};

const analyzeVoiceFeatures = (features) => {
  // Simple rule-based voice emotion analysis
  let emotion = 'neutral';
  let confidence = 0.5;

  if (features.pitch > 200 && features.energy > 0.7) {
    emotion = 'anger';
    confidence = 0.8;
  } else if (features.pitch < 120 && features.energy < 0.4) {
    emotion = 'sadness';
    confidence = 0.7;
  } else if (features.energy > 0.8 && features.spectralCentroid > 2000) {
    emotion = 'joy';
    confidence = 0.75;
  }

  return {
    primaryEmotion: emotion,
    confidence,
    intensity: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
    features
  };
};

const simulateF0Analysis = (audioData) => ({
  mean: Math.random() * 100 + 100,
  std: Math.random() * 20 + 10,
  range: Math.random() * 150 + 50
});

const simulateFormantAnalysis = (audioData) => ({
  f1: Math.random() * 500 + 500,
  f2: Math.random() * 1000 + 1000,
  f3: Math.random() * 1500 + 2000
});

const simulateSpectralAnalysis = (audioData) => ({
  centroid: Math.random() * 2000 + 1000,
  bandwidth: Math.random() * 1000 + 500,
  rolloff: Math.random() * 3000 + 2000
});

const simulateProsodicAnalysis = (audioData) => ({
  rhythm: Math.random(),
  stress: Math.random(),
  intonation: Math.random()
});

const simulateVoiceQualityAnalysis = (audioData) => ({
  jitter: Math.random() * 0.01,
  shimmer: Math.random() * 0.1,
  hnr: Math.random() * 20 + 10
});

const createVoiceFingerprint = (features) => {
  // Create a simplified voice fingerprint
  const fingerprint = [
    features.fundamentalFrequency.mean,
    features.formants.f1,
    features.formants.f2,
    features.spectralFeatures.centroid,
    features.voiceQuality.jitter,
    features.voiceQuality.shimmer
  ];
  
  return fingerprint.map(f => Math.round(f * 1000) / 1000);
};

const calculateBiometricSimilarity = (current, stored) => {
  if (!current.fingerprint || !stored.fingerprint) return 0;
  
  const currentFp = current.fingerprint;
  const storedFp = stored.fingerprint;
  
  // Calculate Euclidean distance
  const distance = Math.sqrt(
    currentFp.reduce((sum, val, i) => {
      const diff = val - storedFp[i];
      return sum + diff * diff;
    }, 0)
  );
  
  // Convert distance to similarity (0-1)
  const maxDistance = Math.sqrt(currentFp.length * 100); // Normalize
  return Math.max(0, 1 - (distance / maxDistance));
};

const analyzeEmotionalTransitions = (journey) => {
  const transitions = [];
  
  for (let i = 1; i < journey.length; i++) {
    const prev = journey[i - 1];
    const curr = journey[i];
    
    if (prev.emotion !== curr.emotion) {
      transitions.push({
        from: prev.emotion,
        to: curr.emotion,
        timestamp: curr.timestamp,
        segmentIndex: i,
        type: prev.emotion === 'neutral' ? 'activation' : 
              curr.emotion === 'neutral' ? 'deactivation' : 'transition'
      });
    }
  }
  
  return transitions;
};

const generateEmotionalInsights = (journey, transitions) => {
  const insights = [];
  
  // Emotional volatility
  if (transitions.length > journey.length * 0.5) {
    insights.push({
      type: 'volatility',
      message: 'High emotional volatility detected',
      recommendation: 'Use consistent, calming communication'
    });
  }
  
  // Escalation pattern
  const escalatingEmotions = ['anger', 'frustration', 'fear'];
  const hasEscalation = journey.some(segment => 
    escalatingEmotions.includes(segment.emotion) && segment.intensity === 'high'
  );
  
  if (hasEscalation) {
    insights.push({
      type: 'escalation',
      message: 'Emotional escalation detected',
      recommendation: 'Consider immediate human intervention'
    });
  }
  
  return insights;
};

const findDominantEmotion = (journey) => {
  const emotionCounts = {};
  journey.forEach(segment => {
    emotionCounts[segment.emotion] = (emotionCounts[segment.emotion] || 0) + 1;
  });
  
  return Object.keys(emotionCounts).reduce((a, b) => 
    emotionCounts[a] > emotionCounts[b] ? a : b
  );
};

const calculateEmotionalStability = (journey) => {
  if (journey.length < 2) return 1;
  
  const transitions = journey.filter((segment, i) => 
    i > 0 && segment.emotion !== journey[i - 1].emotion
  ).length;
  
  return Math.max(0, 1 - (transitions / journey.length));
};

const assessEscalationRisk = (journey) => {
  const riskFactors = journey.filter(segment => 
    ['anger', 'frustration'].includes(segment.emotion) && 
    segment.intensity === 'high'
  ).length;
  
  return riskFactors > 0 ? 'high' : 
         journey.some(s => s.emotion === 'anger') ? 'medium' : 'low';
};

// Database operations

const saveEmotionAnalysis = async (callId, type, analysis) => {
  try {
    await db.query(
      `INSERT INTO emotion_analysis (call_id, analysis_type, emotion_data, created_at) 
       VALUES (?, ?, ?, ?)`,
      [callId, type, JSON.stringify(analysis), new Date()]
    );
  } catch (error) {
    logger.error('Error saving emotion analysis:', error);
  }
};

const updateBiometricProfile = async (customerId, features) => {
  try {
    const existingProfile = await getBiometricProfile(customerId);
    
    if (existingProfile) {
      // Update existing profile
      await db.query(
        `UPDATE voice_biometric_profiles 
         SET features = ?, updated_at = ?, sample_count = sample_count + 1
         WHERE customer_id = ?`,
        [JSON.stringify(features), new Date(), customerId]
      );
    } else {
      // Create new profile
      await db.query(
        `INSERT INTO voice_biometric_profiles (customer_id, features, created_at, sample_count) 
         VALUES (?, ?, ?, 1)`,
        [customerId, JSON.stringify(features), new Date()]
      );
    }
    
    biometricProfiles.set(customerId, features);
  } catch (error) {
    logger.error('Error updating biometric profile:', error);
  }
};

const getBiometricProfile = async (customerId) => {
  try {
    // Check cache first
    if (biometricProfiles.has(customerId)) {
      return biometricProfiles.get(customerId);
    }
    
    const result = await db.query(
      'SELECT features FROM voice_biometric_profiles WHERE customer_id = ?',
      [customerId]
    );
    
    if (result.length > 0) {
      const profile = JSON.parse(result[0].features);
      biometricProfiles.set(customerId, profile);
      return profile;
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting biometric profile:', error);
    return null;
  }
};

const logVerificationAttempt = async (customerId, verification) => {
  try {
    await db.query(
      `INSERT INTO voice_verification_log (customer_id, verified, confidence, created_at) 
       VALUES (?, ?, ?, ?)`,
      [customerId, verification.verified, verification.confidence, new Date()]
    );
  } catch (error) {
    logger.error('Error logging verification attempt:', error);
  }
};

const saveEmotionalJourney = async (callId, journey) => {
  try {
    await db.query(
      `INSERT INTO emotional_journey (call_id, journey_data, created_at) 
       VALUES (?, ?, ?)`,
      [callId, JSON.stringify(journey), new Date()]
    );
  } catch (error) {
    logger.error('Error saving emotional journey:', error);
  }
};

module.exports = {
  initializeEmotionDetection,
  analyzeTextEmotion,
  analyzeVoiceEmotion,
  extractVoiceBiometrics,
  verifyVoiceIdentity,
  trackEmotionalJourney,
  generateEmotionBasedRecommendations
};
