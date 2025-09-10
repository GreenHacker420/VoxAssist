import * as voiceInteractionService from '../voiceInteraction';
import { apiClient } from '../api';

// Mock the API client
jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

// Mock Audio API
const mockAudio = {
  load: jest.fn(),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  canPlayType: jest.fn(),
  onloadeddata: null,
  onerror: null,
  onended: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false
};

global.Audio = jest.fn().mockImplementation(() => mockAudio);

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn()
  }
});

// Mock navigator.permissions
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: jest.fn()
  }
});

describe('VoiceInteractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processSpeech', () => {
    it('should process speech successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'test-call-id',
            customerTranscript: 'Hello',
            aiResponse: 'Hi there!',
            audioUrl: '/audio/response.mp3',
            isProcessing: false
          }
        }
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await voiceInteractionService.processSpeech('test-call-id', 'Hello', false);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/demo-calls/test-call-id/speech',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Failed to process speech'
          }
        }
      };

      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      const result = await voiceInteractionService.processSpeech('test-call-id', 'Hello', false);

      expect(result).toEqual({
        success: false,
        error: 'Failed to process speech'
      });
    });

    it('should include audio data when provided', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'test-call-id',
            customerTranscript: 'Hello'
          }
        }
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await voiceInteractionService.processSpeech('test-call-id', 'Hello', false, mockBlob);

      const formData = (apiClient.post as jest.Mock).mock.calls[0][1];
      expect(formData.get('audioData')).toBe(mockBlob);
    });
  });

  describe('enableVoiceInteraction', () => {
    it('should enable voice interaction successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'test-call-id',
            voiceInteractionEnabled: true,
            message: 'Voice interaction enabled'
          }
        }
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await voiceInteractionService.enableVoiceInteraction('test-call-id');

      expect(apiClient.post).toHaveBeenCalledWith('/demo-calls/test-call-id/enable-voice');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('disableVoiceInteraction', () => {
    it('should disable voice interaction successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'test-call-id',
            voiceInteractionEnabled: false,
            message: 'Voice interaction disabled'
          }
        }
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await voiceInteractionService.disableVoiceInteraction('test-call-id');

      expect(apiClient.post).toHaveBeenCalledWith('/demo-calls/test-call-id/disable-voice');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('playAudioResponse', () => {
    it('should create and load audio element', async () => {
      const audioUrl = '/audio/test.mp3';
      
      const audioPromise = voiceInteractionService.playAudioResponse(audioUrl);
      
      // Simulate successful load
      if (mockAudio.onloadeddata) {
        mockAudio.onloadeddata();
      }

      const audio = await audioPromise;
      
      expect(audio).toBeDefined();
      expect(mockAudio.load).toHaveBeenCalled();
    });

    it('should handle audio loading errors', async () => {
      const audioUrl = '/audio/test.mp3';
      
      const audioPromise = voiceInteractionService.playAudioResponse(audioUrl);
      
      // Simulate error
      if (mockAudio.onerror) {
        mockAudio.onerror(new Error('Failed to load'));
      }

      await expect(audioPromise).rejects.toThrow('Failed to load audio');
    });
  });

  describe('isAudioSupported', () => {
    it('should return true when Audio is available', () => {
      expect(voiceInteractionService.isAudioSupported()).toBe(true);
    });

    it('should return false when Audio is not available', () => {
      const originalAudio = global.Audio;
      delete (global as any).Audio;
      
      expect(voiceInteractionService.isAudioSupported()).toBe(false);
      
      global.Audio = originalAudio;
    });
  });

  describe('getSupportedAudioFormats', () => {
    it('should return supported audio formats', () => {
      mockAudio.canPlayType.mockImplementation((type: string) => {
        if (type === 'audio/mpeg') return 'probably';
        if (type === 'audio/wav') return 'maybe';
        return '';
      });

      const formats = voiceInteractionService.getSupportedAudioFormats();
      
      expect(formats).toContain('mp3');
      expect(formats).toContain('wav');
      expect(formats).not.toContain('ogg');
    });

    it('should return empty array when audio is not supported', () => {
      const originalAudio = global.Audio;
      delete (global as any).Audio;
      
      const formats = voiceInteractionService.getSupportedAudioFormats();
      
      expect(formats).toEqual([]);
      
      global.Audio = originalAudio;
    });
  });

  describe('checkMicrophonePermission', () => {
    it('should return true when permission is granted', async () => {
      (navigator.permissions.query as jest.Mock).mockResolvedValue({
        state: 'granted'
      });

      const hasPermission = await voiceInteractionService.checkMicrophonePermission();
      
      expect(hasPermission).toBe(true);
    });

    it('should fallback to getUserMedia when permissions API fails', async () => {
      (navigator.permissions.query as jest.Mock).mockRejectedValue(new Error('Not supported'));
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });

      const hasPermission = await voiceInteractionService.checkMicrophonePermission();
      
      expect(hasPermission).toBe(true);
    });
  });

  describe('requestMicrophonePermission', () => {
    it('should return true when permission is granted', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });

      const hasPermission = await voiceInteractionService.requestMicrophonePermission();
      
      expect(hasPermission).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const hasPermission = await voiceInteractionService.requestMicrophonePermission();
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('createAudioQueue', () => {
    it('should create audio queue with correct methods', () => {
      const queue = voiceInteractionService.createAudioQueue();
      
      expect(queue).toHaveProperty('add');
      expect(queue).toHaveProperty('clear');
      expect(queue).toHaveProperty('getQueueLength');
      expect(queue).toHaveProperty('isPlaying');
      
      expect(typeof queue.add).toBe('function');
      expect(typeof queue.clear).toBe('function');
      expect(typeof queue.getQueueLength).toBe('function');
      expect(typeof queue.isPlaying).toBe('function');
    });

    it('should manage queue length correctly', () => {
      const queue = voiceInteractionService.createAudioQueue();
      
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isPlaying()).toBe(false);
    });
  });
});
