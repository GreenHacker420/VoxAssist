import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceInteractionManager from '../VoiceInteractionManager';
import * as voiceInteractionService from '../../../services/voiceInteraction';

// Mock the voice interaction service
jest.mock('../../../services/voiceInteraction', () => ({
  processSpeech: jest.fn(),
  enableVoiceInteraction: jest.fn(),
  disableVoiceInteraction: jest.fn(),
  playAudioResponse: jest.fn(),
  isAudioSupported: jest.fn().mockReturnValue(true),
  checkMicrophonePermission: jest.fn(),
  requestMicrophonePermission: jest.fn(),
  createAudioQueue: jest.fn()
}));

// Mock the voice interaction hook
jest.mock('../../../hooks/useVoiceInteraction', () => ({
  useVoiceInteraction: jest.fn()
}));

// Mock WebSocket hook
const mockWebSocketHook = {
  isConnected: true,
  transcript: [],
  currentSentiment: {
    overall: 'neutral',
    score: 0.5,
    emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
  },
  voiceInteractionStatus: 'idle',
  audioResponseUrl: null,
  sendMessage: jest.fn()
};

jest.mock('../../../hooks/useDemoCallWebSocket', () => ({
  useDemoCallWebSocket: () => mockWebSocketHook
}));

const { useVoiceInteraction } = require('../../../hooks/useVoiceInteraction');

describe('VoiceInteractionManager Integration', () => {
  const defaultProps = {
    callId: 'test-call-123',
    isEnabled: true,
    onToggle: jest.fn()
  };

  const mockVoiceHook = {
    isListening: false,
    isSupported: true,
    error: null,
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    clearError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceInteraction.mockReturnValue(mockVoiceHook);
    
    // Mock audio queue
    voiceInteractionService.createAudioQueue.mockReturnValue({
      add: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
      getQueueLength: jest.fn().mockReturnValue(0),
      isPlaying: jest.fn().mockReturnValue(false)
    });

    // Mock microphone permissions
    voiceInteractionService.checkMicrophonePermission.mockResolvedValue(true);
    voiceInteractionService.requestMicrophonePermission.mockResolvedValue(true);
  });

  it('should render voice controls when enabled', () => {
    render(<VoiceInteractionManager {...defaultProps} />);
    
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle voice interaction toggle', async () => {
    voiceInteractionService.enableVoiceInteraction.mockResolvedValue({
      success: true,
      data: {
        callId: 'test-call-123',
        voiceInteractionEnabled: true,
        message: 'Voice interaction enabled'
      }
    });

    render(<VoiceInteractionManager {...defaultProps} isEnabled={false} />);
    
    const toggleButton = screen.getByText('Enable Voice');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(voiceInteractionService.enableVoiceInteraction).toHaveBeenCalledWith('test-call-123');
      expect(defaultProps.onToggle).toHaveBeenCalledWith(true);
    });
  });

  it('should process speech when transcript is available', async () => {
    const mockProcessResponse = {
      success: true,
      data: {
        callId: 'test-call-123',
        customerTranscript: 'Hello, I need help',
        aiResponse: 'How can I assist you?',
        audioUrl: '/audio/response.mp3',
        isProcessing: false,
        transcriptId: 'transcript-123'
      }
    };

    voiceInteractionService.processSpeech.mockResolvedValue(mockProcessResponse);

    // Mock voice hook with transcript
    useVoiceInteraction.mockReturnValue({
      ...mockVoiceHook,
      transcript: 'Hello, I need help',
      isListening: false
    });

    render(<VoiceInteractionManager {...defaultProps} />);

    await waitFor(() => {
      expect(voiceInteractionService.processSpeech).toHaveBeenCalledWith(
        'test-call-123',
        'Hello, I need help',
        false,
        undefined
      );
    });
  });

  it('should handle interim speech results', async () => {
    const mockProcessResponse = {
      success: true,
      data: {
        callId: 'test-call-123',
        customerTranscript: 'Hello...',
        isProcessing: false,
        isInterim: true
      }
    };

    voiceInteractionService.processSpeech.mockResolvedValue(mockProcessResponse);

    // Mock voice hook with interim transcript
    useVoiceInteraction.mockReturnValue({
      ...mockVoiceHook,
      interimTranscript: 'Hello...',
      isListening: true
    });

    render(<VoiceInteractionManager {...defaultProps} />);

    await waitFor(() => {
      expect(voiceInteractionService.processSpeech).toHaveBeenCalledWith(
        'test-call-123',
        'Hello...',
        true,
        undefined
      );
    });
  });

  it('should play audio responses when available', async () => {
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      currentTime: 0,
      duration: 10,
      volume: 1,
      onended: null,
      onerror: null
    };

    voiceInteractionService.playAudioResponse.mockResolvedValue(mockAudio);

    // Mock WebSocket with audio response
    mockWebSocketHook.audioResponseUrl = '/audio/response.mp3';

    render(<VoiceInteractionManager {...defaultProps} />);

    await waitFor(() => {
      expect(voiceInteractionService.playAudioResponse).toHaveBeenCalledWith('/audio/response.mp3');
    });
  });

  it('should handle microphone permission errors', async () => {
    voiceInteractionService.checkMicrophonePermission.mockResolvedValue(false);
    voiceInteractionService.requestMicrophonePermission.mockResolvedValue(false);

    useVoiceInteraction.mockReturnValue({
      ...mockVoiceHook,
      error: 'Microphone access denied'
    });

    render(<VoiceInteractionManager {...defaultProps} />);

    expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should display live transcript updates', () => {
    const mockTranscript = [
      {
        id: 'msg-1',
        speaker: 'customer' as const,
        text: 'Hello, I need help',
        timestamp: new Date().toISOString(),
        confidence: 0.9,
        sentiment: 'neutral' as const,
        sentimentScore: 0.5
      },
      {
        id: 'msg-2',
        speaker: 'ai' as const,
        text: 'How can I assist you?',
        timestamp: new Date().toISOString(),
        confidence: 0.95,
        sentiment: 'positive' as const,
        sentimentScore: 0.8
      }
    ];

    mockWebSocketHook.transcript = mockTranscript;

    render(<VoiceInteractionManager {...defaultProps} />);

    expect(screen.getByText('Hello, I need help')).toBeInTheDocument();
    expect(screen.getByText('How can I assist you?')).toBeInTheDocument();
  });

  it('should show voice interaction status indicators', () => {
    // Test listening status
    mockWebSocketHook.voiceInteractionStatus = 'listening';
    const { rerender } = render(<VoiceInteractionManager {...defaultProps} />);
    expect(screen.getByText('Listening...')).toBeInTheDocument();

    // Test processing status
    mockWebSocketHook.voiceInteractionStatus = 'processing';
    rerender(<VoiceInteractionManager {...defaultProps} />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();

    // Test speaking status
    mockWebSocketHook.voiceInteractionStatus = 'speaking';
    rerender(<VoiceInteractionManager {...defaultProps} />);
    expect(screen.getByText('AI Speaking...')).toBeInTheDocument();
  });

  it('should handle speech processing errors gracefully', async () => {
    voiceInteractionService.processSpeech.mockResolvedValue({
      success: false,
      error: 'Failed to process speech'
    });

    useVoiceInteraction.mockReturnValue({
      ...mockVoiceHook,
      transcript: 'Hello',
      isListening: false
    });

    render(<VoiceInteractionManager {...defaultProps} />);

    await waitFor(() => {
      expect(voiceInteractionService.processSpeech).toHaveBeenCalled();
    });

    // Should not crash and should handle error gracefully
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should manage audio queue properly', async () => {
    const mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
      getQueueLength: jest.fn().mockReturnValue(1),
      isPlaying: jest.fn().mockReturnValue(true)
    };

    voiceInteractionService.createAudioQueue.mockReturnValue(mockQueue);

    mockWebSocketHook.audioResponseUrl = '/audio/response1.mp3';

    render(<VoiceInteractionManager {...defaultProps} />);

    await waitFor(() => {
      expect(mockQueue.add).toHaveBeenCalledWith('/audio/response1.mp3');
    });

    // Simulate second audio response
    mockWebSocketHook.audioResponseUrl = '/audio/response2.mp3';

    await waitFor(() => {
      expect(mockQueue.add).toHaveBeenCalledWith('/audio/response2.mp3');
    });
  });

  it('should clean up resources on unmount', () => {
    const mockQueue = {
      add: jest.fn(),
      clear: jest.fn(),
      getQueueLength: jest.fn().mockReturnValue(0),
      isPlaying: jest.fn().mockReturnValue(false)
    };

    voiceInteractionService.createAudioQueue.mockReturnValue(mockQueue);

    const { unmount } = render(<VoiceInteractionManager {...defaultProps} />);

    unmount();

    expect(mockQueue.clear).toHaveBeenCalled();
  });
});
