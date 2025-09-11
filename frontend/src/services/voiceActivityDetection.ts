/**
 * Voice Activity Detection Service
 * Detects when user starts/stops speaking for conversation management
 */

export interface VoiceActivityOptions {
  threshold?: number;
  minSpeechDuration?: number;
  minSilenceDuration?: number;
  sampleRate?: number;
  fftSize?: number;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onVoiceActivity?: (isActive: boolean, confidence: number) => void;
  onError?: (error: string) => void;
}

export interface VoiceActivityResult {
  isActive: boolean;
  confidence: number;
  energy: number;
  timestamp: number;
}

// Voice Activity Detection State Interface
interface VoiceActivityState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  stream: MediaStream | null;
  isListening: boolean;
  isVoiceActive: boolean;
  options: VoiceActivityOptions;
  threshold: number;
  minSpeechDuration: number;
  minSilenceDuration: number;
  sampleRate: number;
  fftSize: number;
  voiceStartTime: number;
  silenceStartTime: number;
  energyHistory: number[];
  maxHistoryLength: number;
  animationFrame: number | null;
}

// Create voice activity detection state
function createVoiceActivityState(options: VoiceActivityOptions = {}): VoiceActivityState {
  return {
    audioContext: null,
    analyser: null,
    microphone: null,
    stream: null,
    isListening: false,
    isVoiceActive: false,
    options,
    threshold: options.threshold || 0.01,
    minSpeechDuration: options.minSpeechDuration || 300,
    minSilenceDuration: options.minSilenceDuration || 500,
    sampleRate: options.sampleRate || 16000,
    fftSize: options.fftSize || 2048,
    voiceStartTime: 0,
    silenceStartTime: 0,
    energyHistory: [],
    maxHistoryLength: 10,
    animationFrame: null
  };
}

export class VoiceActivityDetection {
  private state: VoiceActivityState;

  constructor(options: VoiceActivityOptions = {}) {
    this.state = createVoiceActivityState(options);
  }

  /**
   * Start voice activity detection
   */
  async startDetection(): Promise<void> {
    try {
      if (this.state.isListening) {
        return;
      }

      // Initialize audio context
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: new(options?: AudioContextOptions) => AudioContext }).webkitAudioContext;
      this.state.audioContext = new AudioContextClass({
        sampleRate: this.state.sampleRate
      });

      // Get microphone access
      this.state.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.state.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio nodes
      this.state.microphone = this.state.audioContext.createMediaStreamSource(this.state.stream);
      this.state.analyser = this.state.audioContext.createAnalyser();

      // Configure analyser
      this.state.analyser.fftSize = this.state.fftSize;
      this.state.analyser.smoothingTimeConstant = 0.8;
      this.state.analyser.minDecibels = -90;
      this.state.analyser.maxDecibels = -10;

      // Connect nodes
      this.state.microphone.connect(this.state.analyser);

      this.state.isListening = true;
      this.startAnalysis();

    } catch (error) {
      console.error('Failed to start voice activity detection:', error);
      this.state.options.onError?.('Failed to access microphone');
      throw error;
    }
  }

  /**
   * Stop voice activity detection
   */
  stopDetection(): void {
    this.state.isListening = false;

    if (this.state.animationFrame) {
      cancelAnimationFrame(this.state.animationFrame);
      this.state.animationFrame = null;
    }

    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
      this.state.stream = null;
    }

    if (this.state.audioContext) {
      this.state.audioContext.close();
      this.state.audioContext = null;
    }

    this.state.microphone = null;
    this.state.analyser = null;
    this.state.isVoiceActive = false;
    this.state.energyHistory = [];
  }

  /**
   * Start audio analysis loop
   */
  private startAnalysis(): void {
    if (!this.state.isListening || !this.state.analyser) {
      return;
    }

    const bufferLength = this.state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!this.state.isListening || !this.state.analyser) {
        return;
      }

      this.state.analyser.getByteFrequencyData(dataArray);

      // Calculate audio energy
      const energy = this.calculateAudioEnergy(dataArray);

      // Update energy history
      this.state.energyHistory.push(energy);
      if (this.state.energyHistory.length > this.state.maxHistoryLength) {
        this.state.energyHistory.shift();
      }

      // Detect voice activity
      const activityResult = this.detectVoiceActivity(energy);

      // Handle voice activity changes
      this.handleVoiceActivityChange(activityResult);

      // Continue analysis
      this.state.animationFrame = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Calculate audio energy from frequency data
   */
  private calculateAudioEnergy(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    return Math.sqrt(sum / dataArray.length) / 255;
  }

  /**
   * Detect voice activity based on energy
   */
  private detectVoiceActivity(energy: number): VoiceActivityResult {
    // Use adaptive threshold based on recent energy history
    const adaptiveThreshold = this.calculateAdaptiveThreshold();
    
    // Calculate confidence based on how much energy exceeds threshold
    const confidence = Math.min(energy / Math.max(adaptiveThreshold, 0.001), 1.0);
    
    const isActive = energy > adaptiveThreshold;

    return {
      isActive,
      confidence,
      energy,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate adaptive threshold based on recent energy history
   */
  private calculateAdaptiveThreshold(): number {
    if (this.state.energyHistory.length < 3) {
      return this.state.threshold;
    }

    // Calculate background noise level
    const sortedHistory = [...this.state.energyHistory].sort((a, b) => a - b);
    const backgroundNoise = sortedHistory[Math.floor(sortedHistory.length * 0.3)];

    // Adaptive threshold is background noise + fixed threshold
    return Math.max(backgroundNoise * 2, this.state.threshold);
  }

  /**
   * Handle voice activity state changes
   */
  private handleVoiceActivityChange(result: VoiceActivityResult): void {
    const now = Date.now();

    if (result.isActive && !this.state.isVoiceActive) {
      // Potential voice start
      if (this.state.voiceStartTime === 0) {
        this.state.voiceStartTime = now;
      } else if (now - this.state.voiceStartTime >= this.state.minSpeechDuration) {
        // Confirmed voice start
        this.state.isVoiceActive = true;
        this.state.silenceStartTime = 0;
        this.state.options.onVoiceStart?.();
        this.state.options.onVoiceActivity?.(true, result.confidence);
      }
    } else if (!result.isActive && this.state.isVoiceActive) {
      // Potential voice end
      if (this.state.silenceStartTime === 0) {
        this.state.silenceStartTime = now;
      } else if (now - this.state.silenceStartTime >= this.state.minSilenceDuration) {
        // Confirmed voice end
        this.state.isVoiceActive = false;
        this.state.voiceStartTime = 0;
        this.state.options.onVoiceEnd?.();
        this.state.options.onVoiceActivity?.(false, 0);
      }
    } else if (result.isActive && this.state.isVoiceActive) {
      // Continue voice activity
      this.state.silenceStartTime = 0;
      this.state.options.onVoiceActivity?.(true, result.confidence);
    } else if (!result.isActive && !this.state.isVoiceActive) {
      // Continue silence
      this.state.voiceStartTime = 0;
    }
  }

  /**
   * Get current voice activity status
   */
  getCurrentActivity(): VoiceActivityResult | null {
    if (!this.state.isListening || !this.state.analyser) {
      return null;
    }

    const bufferLength = this.state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.state.analyser.getByteFrequencyData(dataArray);

    const energy = this.calculateAudioEnergy(dataArray);
    return this.detectVoiceActivity(energy);
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.state.isListening;
  }

  /**
   * Check if voice is currently active
   */
  isVoiceCurrentlyActive(): boolean {
    return this.state.isVoiceActive;
  }

  /**
   * Update detection parameters
   */
  updateParameters(params: Partial<VoiceActivityOptions>): void {
    if (params.threshold !== undefined) {
      this.state.threshold = params.threshold;
    }
    if (params.minSpeechDuration !== undefined) {
      this.state.minSpeechDuration = params.minSpeechDuration;
    }
    if (params.minSilenceDuration !== undefined) {
      this.state.minSilenceDuration = params.minSilenceDuration;
    }

    // Update options
    this.state.options = { ...this.state.options, ...params };
  }

  /**
   * Get detection statistics
   */
  getStats(): {
    isListening: boolean;
    isVoiceActive: boolean;
    currentThreshold: number;
    energyHistory: number[];
    averageEnergy: number;
  } {
    const averageEnergy = this.state.energyHistory.length > 0
      ? this.state.energyHistory.reduce((sum, energy) => sum + energy, 0) / this.state.energyHistory.length
      : 0;

    return {
      isListening: this.state.isListening,
      isVoiceActive: this.state.isVoiceActive,
      currentThreshold: this.calculateAdaptiveThreshold(),
      energyHistory: [...this.state.energyHistory],
      averageEnergy
    };
  }

  /**
   * Calibrate detection based on ambient noise
   */
  async calibrateDetection(duration: number = 3000): Promise<void> {
    if (!this.state.isListening) {
      throw new Error('Voice activity detection must be started before calibration');
    }

    const calibrationEnergies: number[] = [];
    const startTime = Date.now();

    return new Promise((resolve) => {
      const calibrate = () => {
        if (Date.now() - startTime >= duration) {
          // Calculate new threshold based on calibration
          if (calibrationEnergies.length > 0) {
            const sortedEnergies = calibrationEnergies.sort((a, b) => a - b);
            const backgroundNoise = sortedEnergies[Math.floor(sortedEnergies.length * 0.8)];
            this.state.threshold = Math.max(backgroundNoise * 1.5, 0.005);
          }
          resolve();
          return;
        }

        if (this.state.analyser) {
          const bufferLength = this.state.analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          this.state.analyser.getByteFrequencyData(dataArray);

          const energy = this.calculateAudioEnergy(dataArray);
          calibrationEnergies.push(energy);
        }

        setTimeout(calibrate, 100);
      };

      calibrate();
    });
  }
}

// Create singleton instance
export const voiceActivityDetection = new VoiceActivityDetection();
