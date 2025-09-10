import { useState, useRef, useCallback, useEffect } from 'react';
import { message } from 'antd';

interface VoiceInteractionConfig {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
}

interface VoiceInteractionState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

interface VoiceInteractionCallbacks {
  onTranscript?: (transcript: string, isInterim: boolean, confidence: number) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useVoiceInteraction(
  config: VoiceInteractionConfig = {},
  callbacks: VoiceInteractionCallbacks = {}
) {
  const [state, setState] = useState<VoiceInteractionState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    isSupported: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0
  });

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported in this browser' }));
      return null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = config.continuous ?? true;
    recognition.interimResults = config.interimResults ?? true;
    recognition.lang = config.language ?? 'en-US';
    recognition.maxAlternatives = config.maxAlternatives ?? 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setState(prev => ({ ...prev, isListening: true, error: null }));
      callbacks.onStart?.();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        confidence = result[0].confidence || 0.9;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: finalTranscript || prev.transcript,
        interimTranscript,
        confidence
      }));

      // Call transcript callback
      if (finalTranscript) {
        callbacks.onTranscript?.(finalTranscript, false, confidence);
      } else if (interimTranscript) {
        callbacks.onTranscript?.(interimTranscript, true, confidence);
      }

      // Reset silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Set silence timeout for final results
      if (finalTranscript) {
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && state.isListening) {
            console.log('Restarting recognition after silence');
            try {
              recognitionRef.current.stop();
              setTimeout(() => {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              }, 100);
            } catch (error) {
              console.warn('Error restarting recognition:', error);
            }
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred during speech recognition.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
      callbacks.onError?.(errorMessage);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setState(prev => ({ ...prev, isListening: false }));
      callbacks.onEnd?.();

      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };

    return recognition;
  }, [config, callbacks, state.isSupported]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Initialize audio context for voice activity detection
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      const errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
      setState(prev => ({ ...prev, error: errorMessage }));
      message.error(errorMessage);
      return false;
    }
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (!state.isSupported) {
      message.error('Speech recognition not supported in this browser');
      return false;
    }

    if (state.isListening) {
      console.log('Already listening');
      return true;
    }

    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return false;
    }

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = initializeSpeechRecognition();
      }

      if (recognitionRef.current) {
        recognitionRef.current.start();
        return true;
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setState(prev => ({ ...prev, error: 'Failed to start speech recognition' }));
      message.error('Failed to start speech recognition');
    }

    return false;
  }, [state.isSupported, state.isListening, requestMicrophonePermission, initializeSpeechRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      transcript: '', 
      interimTranscript: '',
      error: null 
    }));
  }, [state.isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Set processing state
  const setProcessing = useCallback((processing: boolean) => {
    setState(prev => ({ ...prev, isProcessing: processing }));
  }, []);

  // Set speaking state
  const setSpeaking = useCallback((speaking: boolean) => {
    setState(prev => ({ ...prev, isSpeaking: speaking }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    setProcessing,
    setSpeaking,
    clearError
  };
}
