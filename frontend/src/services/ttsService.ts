/**
 * Text-to-Speech Service for Demo Call Interface
 * Handles real-time audio playback of AI responses
 */

interface TTSOptions {
  volume?: number;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

interface AudioQueueItem {
  id: string;
  audioUrl: string;
  transcriptId?: string;
  text?: string;
  options?: TTSOptions;
}

class TTSService {
  private audioQueue: AudioQueueItem[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private volume: number = 1.0;
  private isMuted: boolean = false;
  private defaultOptions: TTSOptions = {
    volume: 1.0,
    autoPlay: true
  };

  /**
   * Add audio to the playback queue (URL-based)
   */
  async queueAudio(audioUrl: string, transcriptId?: string, text?: string, options?: TTSOptions): Promise<void> {
    const audioItem: AudioQueueItem = {
      id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      audioUrl,
      transcriptId,
      text,
      options: { ...this.defaultOptions, ...options }
    };

    this.audioQueue.push(audioItem);
    console.log(`Added audio to queue: ${audioItem.id}`, { audioUrl, transcriptId, text });

    // Start playing if not already playing
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  /**
   * Add base64 audio data to the playback queue (WebSocket streaming)
   */
  async queueAudioData(audioData: string, transcriptId?: string, text?: string, format: string = 'mp3', options?: TTSOptions): Promise<void> {
    try {
      // Convert base64 to blob
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: `audio/${format}` });
      const audioUrl = URL.createObjectURL(blob);

      const audioItem: AudioQueueItem = {
        id: `audio-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        audioUrl,
        transcriptId,
        text,
        options: { ...this.defaultOptions, ...options }
      };

      this.audioQueue.push(audioItem);
      console.log(`Added streamed audio to queue: ${audioItem.id}`, {
        size: audioData.length,
        format,
        transcriptId,
        text: text?.substring(0, 50) + '...'
      });

      // Start playing if not already playing
      if (!this.isPlaying) {
        await this.playNext();
      }
    } catch (error) {
      console.error('Failed to queue audio data:', error);
      throw new Error('Failed to process audio data');
    }
  }

  /**
   * Play the next audio in the queue
   */
  private async playNext(): Promise<void> {
    if (this.audioQueue.length === 0 || this.isPlaying) {
      return;
    }

    const audioItem = this.audioQueue.shift();
    if (!audioItem) {
      return;
    }

    this.isPlaying = true;
    console.log(`Playing audio: ${audioItem.id}`, audioItem);

    try {
      // Create new audio element
      this.currentAudio = new Audio();
      this.currentAudio.volume = this.isMuted ? 0 : (audioItem.options?.volume || this.volume);
      this.currentAudio.preload = 'auto';

      // Set up event listeners
      this.currentAudio.onloadstart = () => {
        console.log(`Audio loading started: ${audioItem.id}`);
      };

      this.currentAudio.oncanplay = () => {
        console.log(`Audio can play: ${audioItem.id}`);
      };

      this.currentAudio.onplay = () => {
        console.log(`Audio playback started: ${audioItem.id}`);
        audioItem.options?.onPlay?.();
      };

      this.currentAudio.onpause = () => {
        console.log(`Audio playback paused: ${audioItem.id}`);
        audioItem.options?.onPause?.();
      };

      this.currentAudio.onended = () => {
        console.log(`Audio playback ended: ${audioItem.id}`);
        audioItem.options?.onEnded?.();
        this.isPlaying = false;
        this.currentAudio = null;
        
        // Play next audio in queue
        setTimeout(() => this.playNext(), 100);
      };

      this.currentAudio.onerror = (error) => {
        console.error(`Audio playback error: ${audioItem.id}`, error);
        const errorMessage = `Failed to play audio: ${audioItem.audioUrl}`;
        audioItem.options?.onError?.(errorMessage);
        this.isPlaying = false;
        this.currentAudio = null;
        
        // Try next audio in queue
        setTimeout(() => this.playNext(), 100);
      };

      // Set source and start loading
      this.currentAudio.src = audioItem.audioUrl;
      this.currentAudio.load();

      // Auto-play if enabled
      if (audioItem.options?.autoPlay !== false) {
        await this.currentAudio.play();
      }

    } catch (error) {
      console.error(`Error playing audio: ${audioItem.id}`, error);
      audioItem.options?.onError?.(`Failed to play audio: ${error}`);
      this.isPlaying = false;
      this.currentAudio = null;
      
      // Try next audio in queue
      setTimeout(() => this.playNext(), 100);
    }
  }

  /**
   * Stop current audio and clear queue
   */
  stop(): void {
    console.log('Stopping TTS playback and clearing queue');
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    this.audioQueue.length = 0;
    this.isPlaying = false;
  }

  /**
   * Pause current audio
   */
  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      console.log('Pausing TTS playback');
      this.currentAudio.pause();
    }
  }

  /**
   * Resume current audio
   */
  async resume(): Promise<void> {
    if (this.currentAudio && this.currentAudio.paused) {
      console.log('Resuming TTS playback');
      try {
        await this.currentAudio.play();
      } catch (error) {
        console.error('Error resuming audio:', error);
      }
    }
  }

  /**
   * Set volume for all audio playback
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    console.log(`TTS volume set to: ${this.volume}`);
    
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  /**
   * Mute/unmute audio
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    console.log(`TTS muted: ${this.isMuted}`);
    
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  /**
   * Get current playback state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length,
      volume: this.volume,
      isMuted: this.isMuted,
      currentAudio: this.currentAudio ? {
        src: this.currentAudio.src,
        currentTime: this.currentAudio.currentTime,
        duration: this.currentAudio.duration,
        paused: this.currentAudio.paused
      } : null
    };
  }

  /**
   * Check if audio is supported
   */
  isSupported(): boolean {
    return typeof Audio !== 'undefined';
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    if (!this.isSupported()) {
      return [];
    }

    const audio = new Audio();
    const formats = [];

    if (audio.canPlayType('audio/mpeg')) formats.push('mp3');
    if (audio.canPlayType('audio/wav')) formats.push('wav');
    if (audio.canPlayType('audio/ogg')) formats.push('ogg');
    if (audio.canPlayType('audio/mp4')) formats.push('mp4');

    return formats;
  }
}

// Create singleton instance
export const ttsService = new TTSService();

// Export types
export type { TTSOptions, AudioQueueItem };
