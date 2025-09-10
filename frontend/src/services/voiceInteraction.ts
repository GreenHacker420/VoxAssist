import { apiClient } from './api';

export interface VoiceInteractionResponse {
  success: boolean;
  data?: {
    callId: string;
    customerTranscript: string;
    aiResponse?: string;
    audioUrl?: string;
    sentiment?: {
      overall: 'positive' | 'neutral' | 'negative';
      score: number;
      emotions: {
        joy: number;
        anger: number;
        fear: number;
        sadness: number;
        surprise: number;
      };
    };
    isProcessing: boolean;
    transcriptId?: string;
    isInterim?: boolean;
  };
  error?: string;
}

export interface VoiceControlResponse {
  success: boolean;
  data?: {
    callId: string;
    voiceInteractionEnabled: boolean;
    message: string;
  };
  error?: string;
}

/**
 * Process customer speech input
 */
export const processSpeech = async (
  callId: string,
  transcript: string,
  isInterim: boolean = false,
  audioData?: Blob
): Promise<VoiceInteractionResponse> => {
  try {
    const formData = new FormData();
    formData.append('transcript', transcript);
    formData.append('isInterim', isInterim.toString());

    if (audioData) {
      formData.append('audioData', audioData, 'speech.wav');
    }

    const response = await apiClient.post(`/demo-calls/${callId}/speech`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error('Error processing speech:', error);
    return {
      success: false,
      error: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to process speech'
    };
  }
};

/**
 * Enable voice interaction for a demo call
 */
export const enableVoiceInteraction = async (callId: string): Promise<VoiceControlResponse> => {
  try {
    const response = await apiClient.post(`/demo-calls/${callId}/enable-voice`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error enabling voice interaction:', error);
    return {
      success: false,
      error: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to enable voice interaction'
    };
  }
};

/**
 * Disable voice interaction for a demo call
 */
export const disableVoiceInteraction = async (callId: string): Promise<VoiceControlResponse> => {
  try {
    const response = await apiClient.post(`/demo-calls/${callId}/disable-voice`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error disabling voice interaction:', error);
    return {
      success: false,
      error: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to disable voice interaction'
    };
  }
};

/**
 * Play audio response
 */
export const playAudioResponse = async (audioUrl: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.onloadeddata = () => {
        console.log('Audio loaded successfully');
        resolve(audio);
      };
      
      audio.onerror = (error) => {
        console.error('Error loading audio:', error);
        reject(new Error('Failed to load audio'));
      };
      
      audio.onended = () => {
        console.log('Audio playback ended');
      };
      
      // Start loading the audio
      audio.load();
    });
};

/**
 * Check if audio is supported
 */
export const isAudioSupported = (): boolean => {
  return typeof Audio !== 'undefined';
};

/**
 * Get supported audio formats
 */
export const getSupportedAudioFormats = (): string[] => {
  if (!isAudioSupported()) {
    return [];
  }

  const audio = new Audio();
  const formats = [];

  // Check common audio formats
  if (audio.canPlayType('audio/mpeg')) {
    formats.push('mp3');
  }
  if (audio.canPlayType('audio/wav')) {
    formats.push('wav');
  }
  if (audio.canPlayType('audio/ogg')) {
    formats.push('ogg');
  }
  if (audio.canPlayType('audio/mp4')) {
    formats.push('mp4');
  }

  return formats;
};

/**
 * Create audio queue for managing multiple audio responses
 */
export const createAudioQueue = () => {
    const queue: HTMLAudioElement[] = [];
    let isPlaying = false;

    const playNext = async () => {
      if (queue.length === 0 || isPlaying) {
        return;
      }

      isPlaying = true;
      const audio = queue.shift()!;

      try {
        await audio.play();
        
        audio.onended = () => {
          isPlaying = false;
          playNext(); // Play next audio in queue
        };
      } catch (error) {
        console.error('Error playing audio:', error);
        isPlaying = false;
        playNext(); // Try next audio even if current one fails
      }
    };

    return {
      add: async (audioUrl: string) => {
        try {
          const audio = await playAudioResponse(audioUrl);
          queue.push(audio);
          playNext();
        } catch (error) {
          console.error('Error adding audio to queue:', error);
        }
      },
      clear: () => {
        // Stop current audio and clear queue
        queue.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
        });
        queue.length = 0;
        isPlaying = false;
      },
      getQueueLength: () => queue.length,
      isPlaying: () => isPlaying
    };
};

/**
 * Validate microphone permissions
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      console.warn('Could not check microphone permission:', error);
      // Fallback: try to access microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (micError) {
        return false;
      }
    }
};

/**
 * Request microphone permission
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

/**
 * Check if speech recognition is supported
 */
export const isSpeechRecognitionSupported = (): boolean => {
  return typeof window !== 'undefined' &&
         ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

/**
 * Get browser capabilities for voice interaction
 */
export const getBrowserCapabilities = () => {
  return {
    speechRecognition: isSpeechRecognitionSupported(),
    audioPlayback: isAudioSupported(),
    supportedAudioFormats: getSupportedAudioFormats(),
    mediaDevices: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
    getUserMedia: typeof navigator !== 'undefined' &&
                 navigator.mediaDevices &&
                 'getUserMedia' in navigator.mediaDevices
  };
};
