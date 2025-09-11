import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceErrorHandler } from '@/services/voiceErrorHandler';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

interface WebSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: WebSpeechRecognitionResultList;
}

interface WebSpeechRecognitionResultList {
  length: number;
  item(index: number): WebSpeechRecognitionResult;
  [index: number]: WebSpeechRecognitionResult;
}

interface WebSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
    confidence: number;
  };
}

interface WebSpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export function useSpeechToText(options: SpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Refs for speech recognition
  const recognitionRef = useRef<{
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fallbackModeRef = useRef(false);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback((): unknown | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const SpeechRecognition =
      (globalThis as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (globalThis as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const context = voiceErrorHandler.createErrorContext('useSpeechToText', 'initialize');
      voiceErrorHandler.handleError('SPEECH_RECOGNITION_NOT_SUPPORTED', context);
      fallbackModeRef.current = true;
      return null;
    }

    const recognition = new SpeechRecognition() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      maxAlternatives: number;
      start(): void;
      stop(): void;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onspeechstart: (() => void) | null;
      onspeechend: (() => void) | null;
      onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string; confidence: number } } } }) => void) | null;
      onerror: ((event: { error: string }) => void) | null;
    };
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
      options.onStart?.();
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      options.onEnd?.();
    };

    recognition.onspeechstart = () => {
      console.log('Speech detected');
      options.onSpeechStart?.();
    };

    recognition.onspeechend = () => {
      console.log('Speech ended');
      options.onSpeechEnd?.();
    };

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string; confidence: number } } } }) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.8;

        if (result.isFinal) {
          finalTranscript += transcript;
          
          const speechResult: SpeechRecognitionResult = {
            transcript,
            confidence,
            isFinal: true,
            timestamp: Date.now()
          };

          setTranscript(prev => prev + transcript);
          setConfidence(confidence);
          options.onResult?.(speechResult);
        } else {
          interimTranscript += transcript;
          
          const speechResult: SpeechRecognitionResult = {
            transcript,
            confidence,
            isFinal: false,
            timestamp: Date.now()
          };

          setInterimTranscript(transcript);
          options.onResult?.(speechResult);
        }
      }
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error:', event.error);
      const context = voiceErrorHandler.createErrorContext('useSpeechToText', 'recognition', { error: event.error });
      
      // Map Web Speech API errors to our error codes
      let errorCode = 'SPEECH_RECOGNITION_FAILED';
      if (event.error === 'no-speech') {
        errorCode = 'SPEECH_NO_MATCH';
      } else if (event.error === 'not-allowed') {
        errorCode = 'MICROPHONE_ACCESS_DENIED';
      }
      
      voiceErrorHandler.handleError(errorCode, context, {
        onError: (error) => {
          setError(error.message);
          options.onError?.(error.message);
        }
      });
      
      // If error is due to no speech, try to restart
      if (event.error === 'no-speech' && options.continuous) {
        setTimeout(() => {
          if (isListening) {
            startListening();
          }
        }, 1000);
      }
    };

    return recognition;
  }, [options, isListening]);

  // Start fallback recording using MediaRecorder
  const startFallbackRecording = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processFallbackAudio(audioBlob, true);
      };

      mediaRecorderRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        options.onStart?.();
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every second

      // If continuous mode, process chunks periodically
      if (options.continuous) {
        startPeriodicProcessing();
      }

    } catch (error) {
      console.error('Failed to start fallback recording:', error);
      const context = voiceErrorHandler.createErrorContext('useSpeechToText', 'fallbackRecording', { error });
      
      let errorCode = 'MICROPHONE_NOT_FOUND';
      if (error instanceof Error && error.name === 'NotAllowedError') {
        errorCode = 'MICROPHONE_ACCESS_DENIED';
      }
      
      voiceErrorHandler.handleError(errorCode, context, {
        onError: (voiceError) => {
          setError(voiceError.message);
          options.onError?.(voiceError.message);
        }
      });
    }
  }, [options]);

  // Start periodic processing for continuous mode
  const startPeriodicProcessing = useCallback((): void => {
    processingIntervalRef.current = setInterval(() => {
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processFallbackAudio(audioBlob, false);
        audioChunksRef.current = [];
      }
    }, 3000); // Process every 3 seconds
  }, []);

  // Process fallback audio using backend transcription
  const processFallbackAudio = useCallback(async (audioBlob: Blob, isFinal: boolean): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.webm');
      formData.append('language', options.language || 'en-US');

      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data.transcript) {
          const speechResult: SpeechRecognitionResult = {
            transcript: result.data.transcript,
            confidence: result.data.confidence || 0.8,
            isFinal,
            timestamp: Date.now()
          };

          if (isFinal) {
            setTranscript(prev => prev + result.data.transcript);
          } else {
            setInterimTranscript(result.data.transcript);
          }
          
          setConfidence(result.data.confidence || 0.8);
          options.onResult?.(speechResult);
        }
      }
    } catch (error) {
      console.error('Failed to process fallback audio:', error);
      const context = voiceErrorHandler.createErrorContext('useSpeechToText', 'processFallbackAudio', { error });
      
      voiceErrorHandler.handleError('AI_SERVICE_UNAVAILABLE', context, {
        onError: (voiceError) => {
          setError(voiceError.message);
          options.onError?.(voiceError.message);
        }
      });
    }
  }, [options]);

  // Start listening for speech
  const startListening = useCallback(async (): Promise<void> => {
    if (isListening) {
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (fallbackModeRef.current || !recognitionRef.current) {
      return startFallbackRecording();
    }

    try {
      // Configure recognition
      recognitionRef.current.continuous = options.continuous ?? true;
      recognitionRef.current.interimResults = options.interimResults ?? true;
      recognitionRef.current.lang = options.language ?? 'en-US';
      recognitionRef.current.maxAlternatives = options.maxAlternatives ?? 1;

      // Start recognition
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      const context = voiceErrorHandler.createErrorContext('useSpeechToText', 'startListening', { error });
      
      voiceErrorHandler.handleError('SPEECH_RECOGNITION_FAILED', context, {
        onError: (voiceError) => {
          setError(voiceError.message);
          options.onError?.(voiceError.message);
        }
      });
      
      // Fallback to manual recording
      fallbackModeRef.current = true;
      return startFallbackRecording();
    }
  }, [isListening, options, startFallbackRecording]);

  // Stop listening
  const stopListening = useCallback((): void => {
    if (!isListening) {
      return;
    }

    if (recognitionRef.current && !fallbackModeRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current && fallbackModeRef.current) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }

    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    setIsListening(false);
  }, [isListening, fallbackModeRef]);

  // Toggle listening
  const toggleListening = useCallback((): void => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback((): void => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  // Cleanup function
  const cleanup = useCallback((): void => {
    stopListening();
    
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    audioChunksRef.current = [];
  }, [stopListening]);

  // Initialize on mount
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    
    setIsSupported(supported);
    
    if (supported) {
      recognitionRef.current = initializeSpeechRecognition() as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        maxAlternatives: number;
        start(): void;
        stop(): void;
      };
    } else {
      fallbackModeRef.current = true;
    }

    return cleanup;
  }, [initializeSpeechRecognition, cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    cleanup
  };
}
