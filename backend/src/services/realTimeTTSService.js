const logger = require('../utils/logger');
const EventEmitter = require('events');

// Import TTS services
let elevenlabsService;
try {
  elevenlabsService = require('./elevenlabsService');
} catch (error) {
  logger.warn('ElevenLabs service not available, using mock TTS');
  elevenlabsService = {
    textToSpeech: async (text) => ({
      audioBuffer: Buffer.from('mock-audio-data'),
      contentType: 'audio/mpeg',
      size: 1024
    }),
    textToSpeechBuffer: async (text) => Buffer.from('mock-audio-data')
  };
}

/**
 * Real-time Text-to-Speech Service
 * Handles audio generation, streaming, and queue management
 */
class RealTimeTTSService extends EventEmitter {
  constructor() {
    super();
    this.audioQueues = new Map(); // Per-call audio queues
    this.activeGenerations = new Map(); // Track active TTS generations
    this.voiceSettings = new Map(); // Per-call voice settings
    this.streamingEnabled = true;
    this.maxQueueSize = 10;
    this.chunkSize = 1024; // Audio chunk size for streaming
  }

  /**
   * Initialize TTS for a call
   */
  initializeTTS(callId, options = {}) {
    const settings = {
      voiceId: options.voiceId || process.env.ELEVENLABS_VOICE_ID || 'default',
      stability: options.stability || 0.5,
      similarity_boost: options.similarity_boost || 0.5,
      style: options.style || 0.0,
      use_speaker_boost: options.use_speaker_boost || true,
      streaming: options.streaming !== false,
      language: options.language || 'en-US',
      speed: options.speed || 1.0,
      pitch: options.pitch || 1.0
    };

    this.voiceSettings.set(callId, settings);
    this.audioQueues.set(callId, []);

    logger.info(`Initialized TTS for call: ${callId}`, settings);
    return settings;
  }

  /**
   * Generate speech from text with real-time streaming
   */
  async generateSpeech(callId, text, options = {}) {
    const startTime = Date.now();

    try {
      if (!text || text.trim().length === 0) {
        return null;
      }

      const settings = this.voiceSettings.get(callId) || this.initializeTTS(callId, options);
      const generationId = `${callId}-${Date.now()}`;

      // Mark generation as active
      this.activeGenerations.set(generationId, {
        callId,
        text,
        startTime,
        status: 'generating'
      });

      // Optimize text for speech
      const optimizedText = this.optimizeTextForSpeech(text);

      // Generate audio
      let audioResult;
      if (settings.streaming && this.streamingEnabled) {
        audioResult = await this.generateStreamingAudio(callId, optimizedText, settings, generationId);
      } else {
        audioResult = await this.generateBatchAudio(callId, optimizedText, settings, generationId);
      }

      // Update generation status
      const generation = this.activeGenerations.get(generationId);
      if (generation) {
        generation.status = 'completed';
        generation.duration = Date.now() - startTime;
        generation.audioSize = audioResult?.size || 0;
      }

      logger.info(`Generated speech for call ${callId} in ${Date.now() - startTime}ms`);

      return {
        generationId,
        audioData: audioResult?.audioBuffer,
        contentType: audioResult?.contentType,
        size: audioResult?.size,
        duration: Date.now() - startTime,
        text: optimizedText,
        streaming: settings.streaming
      };

    } catch (error) {
      logger.error(`Error generating speech for call ${callId}:`, error);
      
      // Clean up failed generation
      const generation = this.activeGenerations.get(generationId);
      if (generation) {
        generation.status = 'failed';
        generation.error = error.message;
      }

      throw error;
    }
  }

  /**
   * Generate streaming audio
   */
  async generateStreamingAudio(callId, text, settings, generationId) {
    try {
      // For now, we'll simulate streaming by chunking the audio
      // In production, you'd use ElevenLabs streaming API
      const audioResult = await elevenlabsService.textToSpeech(text, settings.voiceId, {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        use_speaker_boost: settings.use_speaker_boost
      });

      if (audioResult && audioResult.audioBuffer) {
        // Stream audio in chunks
        await this.streamAudioChunks(callId, audioResult.audioBuffer, audioResult.contentType, generationId);
      }

      return audioResult;

    } catch (error) {
      logger.error('Error generating streaming audio:', error);
      throw error;
    }
  }

  /**
   * Generate batch audio
   */
  async generateBatchAudio(callId, text, settings, generationId) {
    try {
      const audioResult = await elevenlabsService.textToSpeech(text, settings.voiceId, {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        use_speaker_boost: settings.use_speaker_boost
      });

      if (audioResult && audioResult.audioBuffer) {
        // Add to queue for playback
        this.addToAudioQueue(callId, {
          generationId,
          audioData: audioResult.audioBuffer,
          contentType: audioResult.contentType,
          text: text,
          timestamp: Date.now()
        });
      }

      return audioResult;

    } catch (error) {
      logger.error('Error generating batch audio:', error);
      throw error;
    }
  }

  /**
   * Stream audio in chunks
   */
  async streamAudioChunks(callId, audioBuffer, contentType, generationId) {
    try {
      const totalSize = audioBuffer.length;
      let offset = 0;
      let chunkIndex = 0;

      while (offset < totalSize) {
        const chunkEnd = Math.min(offset + this.chunkSize, totalSize);
        const chunk = audioBuffer.slice(offset, chunkEnd);

        // Emit audio chunk event
        this.emit('audioChunk', {
          callId,
          generationId,
          chunkIndex,
          chunk,
          contentType,
          isLast: chunkEnd >= totalSize,
          totalChunks: Math.ceil(totalSize / this.chunkSize),
          timestamp: Date.now()
        });

        offset = chunkEnd;
        chunkIndex++;

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

    } catch (error) {
      logger.error('Error streaming audio chunks:', error);
      throw error;
    }
  }

  /**
   * Add audio to queue
   */
  addToAudioQueue(callId, audioItem) {
    let queue = this.audioQueues.get(callId);
    
    if (!queue) {
      queue = [];
      this.audioQueues.set(callId, queue);
    }

    // Check queue size limit
    if (queue.length >= this.maxQueueSize) {
      logger.warn(`Audio queue full for call ${callId}, removing oldest item`);
      queue.shift();
    }

    queue.push(audioItem);

    // Emit queue update event
    this.emit('queueUpdate', {
      callId,
      queueSize: queue.length,
      latestItem: audioItem
    });
  }

  /**
   * Get next audio from queue
   */
  getNextAudio(callId) {
    const queue = this.audioQueues.get(callId);
    
    if (!queue || queue.length === 0) {
      return null;
    }

    const audioItem = queue.shift();

    // Emit queue update event
    this.emit('queueUpdate', {
      callId,
      queueSize: queue.length,
      removedItem: audioItem
    });

    return audioItem;
  }

  /**
   * Clear audio queue
   */
  clearAudioQueue(callId) {
    const queue = this.audioQueues.get(callId);
    
    if (queue) {
      const clearedCount = queue.length;
      queue.length = 0;
      
      logger.info(`Cleared ${clearedCount} items from audio queue for call ${callId}`);
      
      this.emit('queueCleared', {
        callId,
        clearedCount
      });
    }
  }

  /**
   * Optimize text for speech synthesis
   */
  optimizeTextForSpeech(text) {
    if (!text) return '';

    let optimized = text.trim();

    // Replace common abbreviations
    optimized = optimized.replace(/\bDr\./g, 'Doctor');
    optimized = optimized.replace(/\bMr\./g, 'Mister');
    optimized = optimized.replace(/\bMrs\./g, 'Missus');
    optimized = optimized.replace(/\bMs\./g, 'Miss');
    optimized = optimized.replace(/\betc\./g, 'etcetera');
    optimized = optimized.replace(/\bi\.e\./g, 'that is');
    optimized = optimized.replace(/\be\.g\./g, 'for example');

    // Handle numbers and dates
    optimized = optimized.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, '$2 $1 $3');
    optimized = optimized.replace(/\$(\d+)/g, '$1 dollars');

    // Add pauses for better speech flow
    optimized = optimized.replace(/\. /g, '. <break time="0.5s"/> ');
    optimized = optimized.replace(/\? /g, '? <break time="0.5s"/> ');
    optimized = optimized.replace(/! /g, '! <break time="0.5s"/> ');

    return optimized;
  }

  /**
   * Get TTS statistics
   */
  getTTSStats(callId) {
    const queue = this.audioQueues.get(callId);
    const settings = this.voiceSettings.get(callId);
    
    const activeGenerationsForCall = Array.from(this.activeGenerations.values())
      .filter(gen => gen.callId === callId);

    return {
      callId,
      queueSize: queue ? queue.length : 0,
      activeGenerations: activeGenerationsForCall.length,
      voiceSettings: settings,
      totalGenerations: activeGenerationsForCall.length,
      completedGenerations: activeGenerationsForCall.filter(g => g.status === 'completed').length,
      failedGenerations: activeGenerationsForCall.filter(g => g.status === 'failed').length
    };
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(callId, newSettings) {
    const currentSettings = this.voiceSettings.get(callId) || {};
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    this.voiceSettings.set(callId, updatedSettings);
    
    logger.info(`Updated voice settings for call ${callId}:`, updatedSettings);
    return updatedSettings;
  }

  /**
   * Cleanup TTS resources for a call
   */
  cleanup(callId) {
    // Clear audio queue
    this.clearAudioQueue(callId);
    
    // Remove voice settings
    this.voiceSettings.delete(callId);
    
    // Clean up active generations
    const generationsToRemove = [];
    for (const [genId, generation] of this.activeGenerations.entries()) {
      if (generation.callId === callId) {
        generationsToRemove.push(genId);
      }
    }
    
    generationsToRemove.forEach(genId => {
      this.activeGenerations.delete(genId);
    });

    logger.info(`Cleaned up TTS resources for call ${callId}`);
  }

  /**
   * Get global TTS statistics
   */
  getGlobalStats() {
    return {
      activeCalls: this.audioQueues.size,
      totalQueuedItems: Array.from(this.audioQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
      activeGenerations: this.activeGenerations.size,
      streamingEnabled: this.streamingEnabled
    };
  }
}

// Create singleton instance
const realTimeTTSService = new RealTimeTTSService();

module.exports = realTimeTTSService;
