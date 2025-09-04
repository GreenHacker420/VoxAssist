const axios = require('axios');
const logger = require('../utils/logger');

// Module state
let apiKey = null;
const baseURL = 'https://api.elevenlabs.io/v1';
const defaultVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice

/**
 * Initialize ElevenLabs service
 */
const initializeElevenLabs = () => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is required');
  }
  
  apiKey = process.env.ELEVENLABS_API_KEY;
  logger.info('ElevenLabs service initialized');
};

/**
 * Convert text to speech using ElevenLabs API
 */
const textToSpeech = async (text, voiceId = null, options = {}) => {
  try {
    if (!apiKey) {
      initializeElevenLabs();
    }
    
    const voice = voiceId || defaultVoiceId;
    const url = `${baseURL}/text-to-speech/${voice}`;
    
    const payload = {
      text: text,
      model_id: options.model || 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarity_boost || 0.5,
        style: options.style || 0.0,
        use_speaker_boost: options.use_speaker_boost || true
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      responseType: 'arraybuffer'
    });

    logger.info(`Generated speech for text: ${text.substring(0, 50)}...`);
    
    return {
      audioBuffer: response.data,
      contentType: 'audio/mpeg',
      size: response.data.length
    };
  } catch (error) {
    logger.error(`ElevenLabs TTS error: ${error.message}`);
    throw new Error('Failed to generate speech');
  }
};

/**
 * Get available voices from ElevenLabs
 */
const getVoices = async () => {
  try {
    if (!apiKey) {
      initializeElevenLabs();
    }
    
    const response = await axios.get(`${baseURL}/voices`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    return response.data.voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      preview_url: voice.preview_url
    }));
  } catch (error) {
    logger.error(`Error fetching voices: ${error.message}`);
    throw new Error('Failed to fetch available voices');
  }
};

/**
 * Clone a voice using ElevenLabs API
 */
const cloneVoice = async (name, description, files) => {
  try {
    if (!apiKey) {
      initializeElevenLabs();
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    const response = await axios.post(`${baseURL}/voices/add`, formData, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'multipart/form-data'
      }
    });

    logger.info(`Voice cloned successfully: ${name}`);
    return response.data;
  } catch (error) {
    logger.error(`Voice cloning error: ${error.message}`);
    throw new Error('Failed to clone voice');
  }
};

/**
 * Stream text to speech using ElevenLabs API
 */
const streamTextToSpeech = async (text, voiceId = null, options = {}) => {
  try {
    if (!apiKey) {
      initializeElevenLabs();
    }
    
    const voice = voiceId || defaultVoiceId;
    const url = `${baseURL}/text-to-speech/${voice}/stream`;
    
    const payload = {
      text: text,
      model_id: options.model || 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarity_boost || 0.5,
        style: options.style || 0.0,
        use_speaker_boost: options.use_speaker_boost || true
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      responseType: 'stream'
    });

    logger.info(`Streaming speech for text: ${text.substring(0, 50)}...`);
    return response.data;
  } catch (error) {
    logger.error(`ElevenLabs streaming error: ${error.message}`);
    throw new Error('Failed to stream speech');
  }
};

/**
 * Get usage information from ElevenLabs
 */
const getUsage = async () => {
  try {
    if (!apiKey) {
      initializeElevenLabs();
    }
    
    const response = await axios.get(`${baseURL}/user`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    return {
      characterCount: response.data.subscription.character_count,
      characterLimit: response.data.subscription.character_limit,
      canExtendCharacterLimit: response.data.subscription.can_extend_character_limit
    };
  } catch (error) {
    logger.error(`Error fetching usage: ${error.message}`);
    throw new Error('Failed to fetch usage information');
  }
};

/**
 * Utility method to optimize text for speech
 */
const optimizeTextForSpeech = (text) => {
  return text
    .replace(/\n/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim();
};

// Initialize on module load
initializeElevenLabs();

// Export all functions
module.exports = {
  initializeElevenLabs,
  textToSpeech,
  getVoices,
  cloneVoice,
  streamTextToSpeech,
  getUsage,
  optimizeTextForSpeech,
  getDefaultVoiceId: () => defaultVoiceId,
  getBaseURL: () => baseURL
};
