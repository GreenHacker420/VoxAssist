const axios = require('axios');
const logger = require('../utils/logger');

class ElevenLabsService {
  constructor() {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }
    
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice
  }

  async textToSpeech(text, voiceId = null, options = {}) {
    try {
      const voice = voiceId || this.defaultVoiceId;
      const url = `${this.baseURL}/text-to-speech/${voice}`;
      
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
          'xi-api-key': this.apiKey
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
  }

  async getVoices() {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
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
  }

  async cloneVoice(name, description, files) {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });

      const response = await axios.post(`${this.baseURL}/voices/add`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      logger.info(`Voice cloned successfully: ${name}`);
      return response.data;
    } catch (error) {
      logger.error(`Voice cloning error: ${error.message}`);
      throw new Error('Failed to clone voice');
    }
  }

  async streamTextToSpeech(text, voiceId = null, options = {}) {
    try {
      const voice = voiceId || this.defaultVoiceId;
      const url = `${this.baseURL}/text-to-speech/${voice}/stream`;
      
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
          'xi-api-key': this.apiKey
        },
        responseType: 'stream'
      });

      logger.info(`Streaming speech for text: ${text.substring(0, 50)}...`);
      return response.data;
    } catch (error) {
      logger.error(`ElevenLabs streaming error: ${error.message}`);
      throw new Error('Failed to stream speech');
    }
  }

  async getUsage() {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: {
          'xi-api-key': this.apiKey
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
  }

  // Utility method to optimize text for speech
  optimizeTextForSpeech(text) {
    return text
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim();
  }
}

module.exports = new ElevenLabsService();
