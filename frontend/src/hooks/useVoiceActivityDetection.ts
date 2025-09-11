import { useState, useEffect, useRef, useCallback } from 'react';

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

export interface VoiceActivityStats {
  isListening: boolean;
  isVoiceActive: boolean;
  currentThreshold: number;
  energyHistory: number[];
  averageEnergy: number;
}

export function useVoiceActivityDetection(options: VoiceActivityOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Detection parameters
  const thresholdRef = useRef(options.threshold || 0.01);
  const minSpeechDurationRef = useRef(options.minSpeechDuration || 300);
  const minSilenceDurationRef = useRef(options.minSilenceDuration || 500);
  const sampleRateRef = useRef(options.sampleRate || 16000);
  const fftSizeRef = useRef(options.fftSize || 2048);

  // State tracking
  const voiceStartTimeRef = useRef(0);
  const silenceStartTimeRef = useRef(0);
  const energyHistoryRef = useRef<number[]>([]);
  const maxHistoryLengthRef = useRef(10);

  // Calculate audio energy from frequency data
  const calculateAudioEnergy = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    return Math.sqrt(sum / dataArray.length) / 255;
  }, []);

  // Calculate adaptive threshold based on recent energy history
  const calculateAdaptiveThreshold = useCallback((): number => {
    if (energyHistoryRef.current.length < 3) {
      return thresholdRef.current;
    }

    const sortedHistory = [...energyHistoryRef.current].sort((a, b) => a - b);
    const backgroundNoise = sortedHistory[Math.floor(sortedHistory.length * 0.3)];
    
    return Math.max(backgroundNoise * 2, thresholdRef.current);
  }, []);

  // Detect voice activity based on energy
  const detectVoiceActivity = useCallback((energy: number): VoiceActivityResult => {
    const adaptiveThreshold = calculateAdaptiveThreshold();
    const confidence = Math.min(energy / Math.max(adaptiveThreshold, 0.001), 1.0);
    const isActive = energy > adaptiveThreshold;

    return {
      isActive,
      confidence,
      energy,
      timestamp: Date.now()
    };
  }, [calculateAdaptiveThreshold]);

  // Handle voice activity state changes
  const handleVoiceActivityChange = useCallback((result: VoiceActivityResult): void => {
    const now = Date.now();

    if (result.isActive && !isVoiceActive) {
      // Potential voice start
      if (voiceStartTimeRef.current === 0) {
        voiceStartTimeRef.current = now;
      } else if (now - voiceStartTimeRef.current >= minSpeechDurationRef.current) {
        // Confirmed voice start
        setIsVoiceActive(true);
        silenceStartTimeRef.current = 0;
        options.onVoiceStart?.();
        options.onVoiceActivity?.(true, result.confidence);
      }
    } else if (!result.isActive && isVoiceActive) {
      // Potential voice end
      if (silenceStartTimeRef.current === 0) {
        silenceStartTimeRef.current = now;
      } else if (now - silenceStartTimeRef.current >= minSilenceDurationRef.current) {
        // Confirmed voice end
        setIsVoiceActive(false);
        voiceStartTimeRef.current = 0;
        options.onVoiceEnd?.();
        options.onVoiceActivity?.(false, 0);
      }
    } else if (result.isActive && isVoiceActive) {
      // Continue voice activity
      silenceStartTimeRef.current = 0;
      options.onVoiceActivity?.(true, result.confidence);
    } else if (!result.isActive && !isVoiceActive) {
      // Continue silence
      voiceStartTimeRef.current = 0;
    }
  }, [isVoiceActive, options]);

  // Start audio analysis loop
  const startAnalysis = useCallback((): void => {
    if (!isListening || !analyserRef.current) {
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!isListening || !analyserRef.current) {
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate audio energy
      const energy = calculateAudioEnergy(dataArray);
      
      // Update energy history
      energyHistoryRef.current.push(energy);
      if (energyHistoryRef.current.length > maxHistoryLengthRef.current) {
        energyHistoryRef.current.shift();
      }

      // Update audio level for visualization
      setAudioLevel(energy * 100);

      // Detect voice activity
      const activityResult = detectVoiceActivity(energy);
      
      // Handle voice activity changes
      handleVoiceActivityChange(activityResult);

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [isListening, calculateAudioEnergy, detectVoiceActivity, handleVoiceActivityChange]);

  // Start voice activity detection
  const startDetection = useCallback(async (): Promise<void> => {
    try {
      if (isListening) {
        return;
      }

      setError(null);

      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)({
        sampleRate: sampleRateRef.current
      });

      // Get microphone access
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: sampleRateRef.current,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio nodes
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyser
      analyserRef.current.fftSize = fftSizeRef.current;
      analyserRef.current.smoothingTimeConstant = 0.8;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      // Connect nodes
      microphoneRef.current.connect(analyserRef.current);

      setIsListening(true);
      startAnalysis();

    } catch (error) {
      const errorMessage = 'Failed to access microphone';
      console.error('Failed to start voice activity detection:', error);
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw error;
    }
  }, [isListening, options, startAnalysis]);

  // Stop voice activity detection
  const stopDetection = useCallback((): void => {
    setIsListening(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    microphoneRef.current = null;
    analyserRef.current = null;
    setIsVoiceActive(false);
    setAudioLevel(0);
    energyHistoryRef.current = [];
  }, []);

  // Update detection parameters
  const updateParameters = useCallback((params: Partial<VoiceActivityOptions>): void => {
    if (params.threshold !== undefined) {
      thresholdRef.current = params.threshold;
    }
    if (params.minSpeechDuration !== undefined) {
      minSpeechDurationRef.current = params.minSpeechDuration;
    }
    if (params.minSilenceDuration !== undefined) {
      minSilenceDurationRef.current = params.minSilenceDuration;
    }
  }, []);

  // Get current activity
  const getCurrentActivity = useCallback((): VoiceActivityResult | null => {
    if (!isListening || !analyserRef.current) {
      return null;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const energy = calculateAudioEnergy(dataArray);
    return detectVoiceActivity(energy);
  }, [isListening, calculateAudioEnergy, detectVoiceActivity]);

  // Get detection statistics
  const getStats = useCallback((): VoiceActivityStats => {
    const averageEnergy = energyHistoryRef.current.length > 0 
      ? energyHistoryRef.current.reduce((sum, energy) => sum + energy, 0) / energyHistoryRef.current.length
      : 0;

    return {
      isListening,
      isVoiceActive,
      currentThreshold: calculateAdaptiveThreshold(),
      energyHistory: [...energyHistoryRef.current],
      averageEnergy
    };
  }, [isListening, isVoiceActive, calculateAdaptiveThreshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isListening,
    isVoiceActive,
    audioLevel,
    error,
    startDetection,
    stopDetection,
    updateParameters,
    getCurrentActivity,
    getStats
  };
}
