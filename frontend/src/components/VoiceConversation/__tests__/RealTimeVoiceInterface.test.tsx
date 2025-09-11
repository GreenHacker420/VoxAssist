import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeVoiceInterface from '../RealTimeVoiceInterface';
import { speechToTextService } from '@/services/speechToText';
import { voiceActivityDetection } from '@/services/voiceActivityDetection';
import { useDemoCallWebSocket } from '@/hooks/useDemoCallWebSocket';

// Mock services
jest.mock('@/services/speechToText');
jest.mock('@/services/voiceActivityDetection');
jest.mock('@/hooks/useDemoCallWebSocket');

const mockSpeechToTextService = speechToTextService as jest.Mocked<typeof speechToTextService>;
const mockVoiceActivityDetection = voiceActivityDetection as jest.Mocked<typeof voiceActivityDetection>;
const mockUseDemoCallWebSocket = useDemoCallWebSocket as jest.MockedFunction<typeof useDemoCallWebSocket>;

// Mock WebSocket hook
const mockWebSocketHook = {
  isConnected: true,
  connectToCall: jest.fn(),
  disconnectFromCall: jest.fn(),
  sendVoiceInput: jest.fn()
};

describe('RealTimeVoiceInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockUseDemoCallWebSocket.mockReturnValue(mockWebSocketHook);
    
    mockSpeechToTextService.startListening.mockResolvedValue(undefined);
    mockSpeechToTextService.stopListening.mockResolvedValue(undefined);
    mockSpeechToTextService.cleanup.mockResolvedValue(undefined);
    
    mockVoiceActivityDetection.startDetection.mockResolvedValue(undefined);
    mockVoiceActivityDetection.stopDetection.mockReturnValue(undefined);
    mockVoiceActivityDetection.isCurrentlyListening.mockReturnValue(false);
    mockVoiceActivityDetection.isVoiceCurrentlyActive.mockReturnValue(false);
  });

  describe('Component Rendering', () => {
    it('renders the voice interface correctly', () => {
      render(<RealTimeVoiceInterface />);
      
      expect(screen.getByText('Voice Conversation')).toBeInTheDocument();
      expect(screen.getByText('Start Conversation')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('shows status indicators', () => {
      render(<RealTimeVoiceInterface />);
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
      expect(screen.getByText('Speaking')).toBeInTheDocument();
      expect(screen.getByText('Voice Activity')).toBeInTheDocument();
      expect(screen.getByText('Audio Level')).toBeInTheDocument();
    });

    it('displays conversation messages area', () => {
      render(<RealTimeVoiceInterface showTranscript={true} />);
      
      expect(screen.getByText('Start speaking to begin the conversation')).toBeInTheDocument();
    });
  });

  describe('Voice Conversation Flow', () => {
    it('starts conversation when button is clicked', async () => {
      render(<RealTimeVoiceInterface callId="test-call-123" />);
      
      const startButton = screen.getByText('Start Conversation');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockWebSocketHook.connectToCall).toHaveBeenCalledWith('test-call-123');
        expect(mockVoiceActivityDetection.startDetection).toHaveBeenCalled();
        expect(mockSpeechToTextService.startListening).toHaveBeenCalled();
      });
    });

    it('stops conversation when end button is clicked', async () => {
      render(<RealTimeVoiceInterface callId="test-call-123" />);
      
      // Start conversation first
      const startButton = screen.getByText('Start Conversation');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('End')).toBeInTheDocument();
      });

      // End conversation
      const endButton = screen.getByText('End');
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockWebSocketHook.disconnectFromCall).toHaveBeenCalled();
        expect(mockVoiceActivityDetection.stopDetection).toHaveBeenCalled();
        expect(mockSpeechToTextService.cleanup).toHaveBeenCalled();
      });
    });

    it('pauses and resumes conversation', async () => {
      render(<RealTimeVoiceInterface callId="test-call-123" />);
      
      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });

      // Pause conversation
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      
      await waitFor(() => {
        expect(mockSpeechToTextService.stopListening).toHaveBeenCalled();
        expect(mockVoiceActivityDetection.stopDetection).toHaveBeenCalled();
        expect(screen.getByText('Resume')).toBeInTheDocument();
      });

      // Resume conversation
      fireEvent.click(screen.getByText('Resume'));
      
      await waitFor(() => {
        expect(mockVoiceActivityDetection.startDetection).toHaveBeenCalledTimes(2);
        expect(mockSpeechToTextService.startListening).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Speech Recognition Integration', () => {
    it('handles speech recognition results', async () => {
      const onStateChange = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onStateChange={onStateChange}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Simulate speech recognition result
      const speechResult = {
        transcript: 'Hello, how are you?',
        confidence: 0.95,
        isFinal: true
      };

      // Get the onResult callback from startListening call
      const startListeningCall = mockSpeechToTextService.startListening.mock.calls[0][0];
      startListeningCall.onResult(speechResult);

      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                speaker: 'user',
                text: 'Hello, how are you?',
                confidence: 0.95
              })
            ])
          })
        );
      });
    });

    it('handles interim speech results', async () => {
      const onStateChange = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onStateChange={onStateChange}
          showTranscript={true}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Simulate interim speech result
      const interimResult = {
        transcript: 'Hello, how...',
        confidence: 0.7,
        isFinal: false
      };

      const startListeningCall = mockSpeechToTextService.startListening.mock.calls[0][0];
      startListeningCall.onResult(interimResult);

      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            currentTranscript: 'Hello, how...'
          })
        );
      });
    });
  });

  describe('Voice Activity Detection', () => {
    it('handles voice activity start and end', async () => {
      const onStateChange = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onStateChange={onStateChange}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Get voice activity callbacks
      const vadCall = mockVoiceActivityDetection.startDetection.mock.calls[0][0];
      
      // Simulate voice start
      vadCall.onVoiceStart();
      
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            voiceActivity: true
          })
        );
      });

      // Simulate voice end
      vadCall.onVoiceEnd();
      
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            voiceActivity: false
          })
        );
      });
    });

    it('updates audio levels during voice activity', async () => {
      const onStateChange = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onStateChange={onStateChange}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Get voice activity callback
      const vadCall = mockVoiceActivityDetection.startDetection.mock.calls[0][0];
      
      // Simulate voice activity with confidence
      vadCall.onVoiceActivity(true, 0.8);
      
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            voiceActivity: true
          })
        );
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('sends voice input to WebSocket when speech is recognized', async () => {
      render(<RealTimeVoiceInterface callId="test-call-123" />);

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Simulate final speech result
      const speechResult = {
        transcript: 'Test message',
        confidence: 0.9,
        isFinal: true
      };

      const startListeningCall = mockSpeechToTextService.startListening.mock.calls[0][0];
      startListeningCall.onResult(speechResult);

      await waitFor(() => {
        expect(mockWebSocketHook.sendVoiceInput).toHaveBeenCalledWith(
          'Test message',
          'text',
          expect.objectContaining({
            confidence: 0.9,
            timestamp: expect.any(Number)
          })
        );
      });
    });

    it('handles AI audio responses', async () => {
      const mockAudio = {
        play: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      
      // Mock Audio constructor
      global.Audio = jest.fn().mockImplementation(() => mockAudio);
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:audio-url');
      global.URL.revokeObjectURL = jest.fn();

      const onStateChange = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onStateChange={onStateChange}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Get WebSocket callbacks
      const webSocketCall = mockUseDemoCallWebSocket.mock.calls[0][0];
      
      // Simulate AI audio response
      const audioResponse = {
        text: 'Hello! How can I help you?',
        audioData: 'base64-audio-data',
        contentType: 'audio/mpeg',
        confidence: 0.95
      };

      webSocketCall.onAudioResponse(audioResponse);

      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                speaker: 'ai',
                text: 'Hello! How can I help you?'
              })
            ]),
            isSpeaking: true
          })
        );
      });

      expect(mockAudio.play).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles speech recognition errors', async () => {
      const onError = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onError={onError}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Simulate speech recognition error
      const startListeningCall = mockSpeechToTextService.startListening.mock.calls[0][0];
      startListeningCall.onError('Speech recognition failed');

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Speech recognition failed');
      });
    });

    it('handles voice activity detection errors', async () => {
      const onError = jest.fn();
      render(
        <RealTimeVoiceInterface 
          callId="test-call-123" 
          onError={onError}
        />
      );

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      // Simulate VAD error
      const vadCall = mockVoiceActivityDetection.startDetection.mock.calls[0][0];
      vadCall.onError('Microphone access denied');

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Microphone access denied');
      });
    });

    it('shows connection issues when WebSocket is disconnected', () => {
      mockUseDemoCallWebSocket.mockReturnValue({
        ...mockWebSocketHook,
        isConnected: false
      });

      render(<RealTimeVoiceInterface callId="test-call-123" />);

      // Start conversation
      fireEvent.click(screen.getByText('Start Conversation'));

      expect(screen.getByText('Connection Issue')).toBeInTheDocument();
      expect(screen.getByText('Trying to reconnect to voice services...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for controls', () => {
      render(<RealTimeVoiceInterface showControls={true} />);
      
      expect(screen.getByRole('button', { name: /start conversation/i })).toBeInTheDocument();
    });

    it('shows visual indicators for voice activity', async () => {
      render(<RealTimeVoiceInterface />);
      
      // Voice activity indicators should be present
      expect(screen.getByText('Voice Activity')).toBeInTheDocument();
      expect(screen.getByText('Audio Level')).toBeInTheDocument();
    });
  });
});
