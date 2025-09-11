/**
 * Real-time Speech-to-Text Service
 * Provides continuous speech recognition using Web Speech API with fallbacks
 */

// Declare global types for Web Speech API
declare global {
  var SpeechRecognition: {
    new (): WebSpeechRecognition;
  } | undefined;
  var webkitSpeechRecognition: {
    new (): WebSpeechRecognition;
  } | undefined;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: WebSpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: WebSpeechRecognition, ev: Event) => unknown) | null;
  onspeechstart: ((this: WebSpeechRecognition, ev: Event) => unknown) | null;
  onspeechend: ((this: WebSpeechRecognition, ev: Event) => unknown) | null;
  onresult: ((this: WebSpeechRecognition, ev: WebSpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: WebSpeechRecognition, ev: WebSpeechRecognitionErrorEvent) => unknown) | null;
}

interface WebSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: WebSpeechRecognitionResultList;
}

interface WebSpeechRecognitionResultList {
  readonly length: number;
  item(index: number): WebSpeechRecognitionResult;
  [index: number]: WebSpeechRecognitionResult;
}

interface WebSpeechRecognitionResult {
  readonly length: number;
  item(index: number): WebSpeechRecognitionAlternative;
  [index: number]: WebSpeechRecognitionAlternative;
  isFinal: boolean;
}

interface WebSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
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

// Speech-to-Text Service State Interface
interface SpeechToTextState {
  recognition: WebSpeechRecognition | null;
  isListening: boolean;
  options: SpeechRecognitionOptions;
  fallbackMode: boolean;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  processingInterval: NodeJS.Timeout | null;
}

// Create speech-to-text state
function createSpeechToTextState(): SpeechToTextState {
  return {
    recognition: null,
    isListening: false,
    options: {},
    fallbackMode: false,
    mediaRecorder: null,
    audioChunks: [],
    processingInterval: null
  };
}

export class SpeechToTextService {
  private state: SpeechToTextState;

  constructor() {
    this.state = createSpeechToTextState();
    this.initializeWebSpeechAPI();
  }

  /**
   * Initialize Web Speech API
   */
  private initializeWebSpeechAPI(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Check for Web Speech API support
    const SpeechRecognition = 
      (globalThis as { SpeechRecognition?: new () => WebSpeechRecognition; webkitSpeechRecognition?: new () => WebSpeechRecognition }).SpeechRecognition || 
      (globalThis as { SpeechRecognition?: new () => WebSpeechRecognition; webkitSpeechRecognition?: new () => WebSpeechRecognition }).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.state.recognition = new SpeechRecognition() as WebSpeechRecognition;
      this.setupRecognitionHandlers();
    } else {
      console.warn('Web Speech API not supported, will use fallback mode');
      this.state.fallbackMode = true;
    }
  }
 
  /**
   * Setup speech recognition event handlers
   */
  private setupRecognitionHandlers(): void {
    if (!this.state.recognition) return;

    this.state.recognition.onstart = () => {
      this.state.isListening = true;
      this.state.options.onStart?.();
    };

    this.state.recognition.onend = () => {
      this.state.isListening = false;
      this.state.options.onEnd?.();
    };

    this.state.recognition.onspeechstart = () => {
      this.state.options.onSpeechStart?.();
    };

    this.state.recognition.onspeechend = () => {
      this.state.options.onSpeechEnd?.();
    };

    this.state.recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        const speechResult: SpeechRecognitionResult = {
          transcript,
          confidence,
          isFinal: result.isFinal,
          timestamp: Date.now()
        };

        this.state.options.onResult?.(speechResult);
      }
    };

    this.state.recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.state.options.onError?.(event.error);
      
      // If error is due to no speech, try to restart
      if (event.error === 'no-speech' && this.state.options.continuous) {
        setTimeout(() => {
          if (this.state.isListening) {
            this.startListening(this.state.options);
          }
        }, 1000);
      }
    };
  }

  /**
   * Start listening for speech
   */
  public async startListening(options: SpeechRecognitionOptions = {}): Promise<void> {
    this.state.options = { ...this.state.options, ...options };

    if (this.state.fallbackMode || !this.state.recognition) {
      return this.startFallbackRecording();
    }

    try {
      // Configure recognition
      this.state.recognition.continuous = options.continuous ?? true;
      this.state.recognition.interimResults = options.interimResults ?? true;
      this.state.recognition.lang = options.language ?? 'en-US';
      this.state.recognition.maxAlternatives = options.maxAlternatives ?? 1;

      // Start recognition
      this.state.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.state.options.onError?.('Failed to start speech recognition');
      
      // Fallback to manual recording
      this.state.fallbackMode = true;
      return this.startFallbackRecording();
    }
  }

  /**
   * Stop listening for speech
   */
  public stopListening(): void {
    if (this.state.recognition && this.state.isListening) {
      this.state.recognition.stop();
    }

    if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
      this.state.mediaRecorder.stop();
    }
  }

  /**
   * Check if currently listening
   */
  public isCurrentlyListening(): boolean {
    return this.state.isListening || (this.state.mediaRecorder?.state === 'recording');
  }

  /**
   * Check if Web Speech API is supported
   */
  public isWebSpeechSupported(): boolean {
    return !this.state.fallbackMode && this.state.recognition !== null;
  }

  /**
   * Start fallback recording using MediaRecorder
   */
  private async startFallbackRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      this.state.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.state.audioChunks = [];

      this.state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.state.audioChunks.push(event.data);
        }
      };

      this.state.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.state.audioChunks, { type: 'audio/webm' });
        await this.processFallbackAudio(audioBlob);
        this.state.audioChunks = [];
      };

      this.state.mediaRecorder.onstart = () => {
        this.state.isListening = true;
        this.state.options.onStart?.();
      };

      // Start recording
      this.state.mediaRecorder.start(1000); // Collect data every second

      // If continuous mode, process chunks periodically
      if (this.state.options.continuous) {
        this.startPeriodicProcessing();
      }

    } catch (error) {
      console.error('Failed to start fallback recording:', error);
      this.state.options.onError?.('Failed to access microphone');
    }
  }

  /**
   * Start periodic processing for continuous mode
   */
  private startPeriodicProcessing(): void {
    const processInterval = setInterval(() => {
      if (!this.state.isListening) {
        clearInterval(processInterval);
        return;
      }

      if (this.state.audioChunks.length > 0) {
        const audioBlob = new Blob(this.state.audioChunks, { type: 'audio/webm' });
        this.processFallbackAudio(audioBlob, false); // Don't clear chunks for continuous mode
      }
    }, 2000); // Process every 2 seconds
  }

  /**
   * Process audio using fallback transcription service
   */
  private async processFallbackAudio(audioBlob: Blob, isFinal: boolean = true): Promise<void> {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to backend for transcription
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          audioData: base64Audio,
          format: 'webm',
          isFinal
        })
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

          this.state.options.onResult?.(speechResult);
        }
      }
    } catch (error) {
      console.error('Failed to process fallback audio:', error);
      this.state.options.onError?.('Failed to transcribe audio');
    }
  }

  /**
   * Get available languages for speech recognition
   */
  public getAvailableLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 
      'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'ar-SA'
    ];
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopListening();
    
    if (this.state.mediaRecorder?.stream) {
      this.state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    this.state.recognition = null;
    this.state.mediaRecorder = null;
    this.state.audioChunks = [];
    this.state.isListening = false;
  }
}

// Create singleton instance
export const speechToTextService = new SpeechToTextService();
