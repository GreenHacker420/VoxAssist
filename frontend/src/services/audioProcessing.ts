/**
 * Audio Processing Service
 * Provides audio enhancement, noise reduction, and quality optimization
 */

export interface AudioProcessingOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  highpassFilter?: boolean;
  lowpassFilter?: boolean;
  compressionRatio?: number;
}

export interface AudioQualityMetrics {
  signalToNoiseRatio: number;
  dynamicRange: number;
  peakLevel: number;
  rmsLevel: number;
  clippingDetected: boolean;
  qualityScore: number;
}

export class AudioProcessingService {
  private audioContext: AudioContext | null = null;
  private processingChain: AudioNode[] = [];
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * Initialize audio context and processing nodes
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.setupProcessingChain();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Setup audio processing chain
   */
  private setupProcessingChain(): void {
    if (!this.audioContext) return;

    // Create processing nodes
    this.analyser = this.audioContext.createAnalyser();
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.highpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.gainNode = this.audioContext.createGain();

    // Configure analyser
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Configure compressor for dynamic range control
    this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
    this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

    // Configure highpass filter (remove low-frequency noise)
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime);
    this.highpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);

    // Configure lowpass filter (remove high-frequency noise)
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(8000, this.audioContext.currentTime);
    this.lowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);

    // Set initial gain
    this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

    // Store processing chain
    this.processingChain = [
      this.highpassFilter,
      this.lowpassFilter,
      this.compressor,
      this.gainNode,
      this.analyser
    ];
  }

  /**
   * Process audio stream with enhancement
   */
  async processAudioStream(
    inputStream: MediaStream, 
    options: AudioProcessingOptions = {}
  ): Promise<MediaStream> {
    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      // Create source from input stream
      const source = this.audioContext.createMediaStreamSource(inputStream);
      
      // Apply processing chain
      let currentNode: AudioNode = source;
      
      for (const processor of this.processingChain) {
        currentNode.connect(processor);
        currentNode = processor;
      }

      // Create output stream
      const destination = this.audioContext.createMediaStreamDestination();
      currentNode.connect(destination);

      // Apply additional processing options
      this.applyProcessingOptions(options);

      return destination.stream;

    } catch (error) {
      console.error('Failed to process audio stream:', error);
      return inputStream; // Return original stream as fallback
    }
  }

  /**
   * Apply processing options to the audio chain
   */
  private applyProcessingOptions(options: AudioProcessingOptions): void {
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    // Adjust highpass filter
    if (options.highpassFilter !== false && this.highpassFilter) {
      this.highpassFilter.frequency.setValueAtTime(
        options.highpassFilter ? 100 : 80, 
        currentTime
      );
    }

    // Adjust lowpass filter
    if (options.lowpassFilter !== false && this.lowpassFilter) {
      this.lowpassFilter.frequency.setValueAtTime(
        options.lowpassFilter ? 6000 : 8000, 
        currentTime
      );
    }

    // Adjust compression
    if (options.compressionRatio && this.compressor) {
      this.compressor.ratio.setValueAtTime(
        options.compressionRatio, 
        currentTime
      );
    }
  }

  /**
   * Analyze audio quality metrics
   */
  analyzeAudioQuality(): AudioQualityMetrics {
    if (!this.analyser) {
      return {
        signalToNoiseRatio: 0,
        dynamicRange: 0,
        peakLevel: 0,
        rmsLevel: 0,
        clippingDetected: false,
        qualityScore: 0
      };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);

    this.analyser.getByteFrequencyData(dataArray);
    this.analyser.getByteTimeDomainData(timeDataArray);

    // Calculate metrics
    const peakLevel = this.calculatePeakLevel(timeDataArray);
    const rmsLevel = this.calculateRMSLevel(timeDataArray);
    const signalToNoiseRatio = this.calculateSNR(dataArray);
    const dynamicRange = this.calculateDynamicRange(dataArray);
    const clippingDetected = this.detectClipping(timeDataArray);

    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore({
      signalToNoiseRatio,
      dynamicRange,
      peakLevel,
      rmsLevel,
      clippingDetected
    });

    return {
      signalToNoiseRatio,
      dynamicRange,
      peakLevel,
      rmsLevel,
      clippingDetected,
      qualityScore
    };
  }

  /**
   * Calculate peak audio level
   */
  private calculatePeakLevel(timeData: Uint8Array): number {
    let peak = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = Math.abs(timeData[i] - 128) / 128;
      if (sample > peak) {
        peak = sample;
      }
    }
    return peak;
  }

  /**
   * Calculate RMS (Root Mean Square) level
   */
  private calculateRMSLevel(timeData: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128;
      sum += sample * sample;
    }
    return Math.sqrt(sum / timeData.length);
  }

  /**
   * Calculate Signal-to-Noise Ratio
   */
  private calculateSNR(frequencyData: Uint8Array): number {
    // Simple SNR calculation based on frequency distribution
    const signalBand = frequencyData.slice(10, 100); // Voice frequency range
    const noiseBand = frequencyData.slice(200, 300); // Higher frequency noise

    const signalPower = signalBand.reduce((sum, val) => sum + val * val, 0) / signalBand.length;
    const noisePower = noiseBand.reduce((sum, val) => sum + val * val, 0) / noiseBand.length;

    return noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
  }

  /**
   * Calculate dynamic range
   */
  private calculateDynamicRange(frequencyData: Uint8Array): number {
    const max = Math.max(...frequencyData);
    const min = Math.min(...frequencyData.filter(val => val > 0));
    return max - min;
  }

  /**
   * Detect audio clipping
   */
  private detectClipping(timeData: Uint8Array): boolean {
    const threshold = 250; // Near maximum value (255)
    let clippingCount = 0;

    for (let i = 0; i < timeData.length; i++) {
      if (timeData[i] >= threshold || timeData[i] <= (255 - threshold)) {
        clippingCount++;
      }
    }

    // Consider clipping if more than 1% of samples are clipped
    return (clippingCount / timeData.length) > 0.01;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(metrics: Omit<AudioQualityMetrics, 'qualityScore'>): number {
    let score = 100;

    // Penalize low SNR
    if (metrics.signalToNoiseRatio < 20) {
      score -= (20 - metrics.signalToNoiseRatio) * 2;
    }

    // Penalize low dynamic range
    if (metrics.dynamicRange < 50) {
      score -= (50 - metrics.dynamicRange) * 0.5;
    }

    // Penalize clipping
    if (metrics.clippingDetected) {
      score -= 20;
    }

    // Penalize very low or very high levels
    if (metrics.rmsLevel < 0.1 || metrics.rmsLevel > 0.8) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Apply noise gate to reduce background noise
   */
  applyNoiseGate(threshold: number = 0.01): void {
    if (!this.gainNode || !this.audioContext) return;

    // Simple noise gate implementation
    const currentTime = this.audioContext.currentTime;
    
    if (this.analyser) {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteTimeDomainData(dataArray);
      
      const rmsLevel = this.calculateRMSLevel(dataArray);
      
      if (rmsLevel < threshold) {
        // Reduce gain when below threshold
        this.gainNode.gain.setValueAtTime(0.1, currentTime);
      } else {
        // Normal gain when above threshold
        this.gainNode.gain.setValueAtTime(1.0, currentTime);
      }
    }
  }

  /**
   * Get real-time audio levels for visualization
   */
  getAudioLevels(): { peak: number; rms: number; frequency: Uint8Array } {
    if (!this.analyser) {
      return {
        peak: 0,
        rms: 0,
        frequency: new Uint8Array(0)
      };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    this.analyser.getByteTimeDomainData(timeData);
    this.analyser.getByteFrequencyData(frequencyData);

    return {
      peak: this.calculatePeakLevel(timeData),
      rms: this.calculateRMSLevel(timeData),
      frequency: frequencyData
    };
  }

  /**
   * Cleanup audio processing resources
   */
  cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.processingChain = [];
    this.analyser = null;
    this.compressor = null;
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.gainNode = null;
  }

  /**
   * Check if audio processing is supported
   */
  isSupported(): boolean {
    return !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  }

  /**
   * Get audio context state
   */
  getContextState(): string {
    return this.audioContext?.state || 'closed';
  }
}

// Create singleton instance
export const audioProcessingService = new AudioProcessingService();
