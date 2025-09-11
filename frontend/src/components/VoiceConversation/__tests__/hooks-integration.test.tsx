import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealTimeVoiceInterface } from '../RealTimeVoiceInterface';

// Mock the hooks
const mockUseVoiceActivityDetection = jest.fn(() => ({
  isListening: false,
  isVoiceActive: false,
  audioLevel: 0,
  error: null,
  startDetection: jest.fn(),
  stopDetection: jest.fn(),
  updateParameters: jest.fn(),
  getCurrentActivity: jest.fn(),
  getStats: jest.fn()
}));

const mockUseSpeechToText = jest.fn(() => ({
  isListening: false,
  transcript: '',
  interimTranscript: '',
  confidence: 0,
  error: null,
  isSupported: true,
  startListening: jest.fn(),
  stopListening: jest.fn(),
  toggleListening: jest.fn(),
  clearTranscript: jest.fn(),
  cleanup: jest.fn()
}));

const mockUseDemoCallWebSocket = jest.fn(() => ({
  isConnected: false,
  connectionState: 'disconnected',
  error: null,
  connectToCall: jest.fn(),
  disconnectFromCall: jest.fn(),
  sendVoiceInput: jest.fn(),
  sendMessage: jest.fn()
}));

jest.mock('@/hooks/useVoiceActivityDetection', () => ({
  useVoiceActivityDetection: mockUseVoiceActivityDetection
}));

jest.mock('@/hooks/useSpeechToText', () => ({
  useSpeechToText: mockUseSpeechToText
}));

jest.mock('@/hooks/useDemoCallWebSocket', () => ({
  useDemoCallWebSocket: mockUseDemoCallWebSocket
}));

// Mock Web APIs
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createMediaStreamSource: jest.fn(),
    createAnalyser: jest.fn(),
    close: jest.fn()
  }))
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  }
});

describe('RealTimeVoiceInterface - Functional Component Conversion', () => {
  const defaultProps = {
    callId: 'test-call-123',
    settings: {
      language: 'en-US',
      voiceThreshold: 0.01,
      showInterimResults: true,
      autoResponse: true
    },
    onError: jest.fn(),
    onStatusChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<RealTimeVoiceInterface {...defaultProps} />);
    expect(screen.getByText('Start Conversation')).toBeInTheDocument();
  });

  it('displays status indicators correctly', () => {
    render(<RealTimeVoiceInterface {...defaultProps} />);
    
    // Check for status indicators
    expect(screen.getByText('Not Listening')).toBeInTheDocument();
    expect(screen.getByText('Voice Activity')).toBeInTheDocument();
    expect(screen.getByText('Audio Level')).toBeInTheDocument();
  });

  it('shows start conversation button when idle', () => {
    render(<RealTimeVoiceInterface {...defaultProps} />);
    
    const startButton = screen.getByText('Start Conversation');
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();
  });

  it('handles conversation start correctly', async () => {
    const mockStartVAD = jest.fn();
    const mockStartSTT = jest.fn();
    const mockConnectToCall = jest.fn();

    mockUseVoiceActivityDetection.mockReturnValue({
      isListening: false,
      isVoiceActive: false,
      audioLevel: 0,
      error: null,
      startDetection: mockStartVAD,
      stopDetection: jest.fn(),
      updateParameters: jest.fn(),
      getCurrentActivity: jest.fn(),
      getStats: jest.fn()
    });

    mockUseSpeechToText.mockReturnValue({
      isListening: false,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
      isSupported: true,
      startListening: mockStartSTT,
      stopListening: jest.fn(),
      toggleListening: jest.fn(),
      clearTranscript: jest.fn(),
      cleanup: jest.fn()
    });

    mockUseDemoCallWebSocket.mockReturnValue({
      isConnected: false,
      connectionState: 'disconnected',
      error: null,
      connectToCall: mockConnectToCall,
      disconnectFromCall: jest.fn(),
      sendVoiceInput: jest.fn(),
      sendMessage: jest.fn()
    });

    render(<RealTimeVoiceInterface {...defaultProps} />);

    const startButton = screen.getByText('Start Conversation');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockConnectToCall).toHaveBeenCalledWith('test-call-123');
      expect(mockStartVAD).toHaveBeenCalled();
      expect(mockStartSTT).toHaveBeenCalled();
    });
  });

  it('displays voice activity when active', () => {
    mockUseVoiceActivityDetection.mockReturnValue({
      isListening: true,
      isVoiceActive: true,
      audioLevel: 75,
      error: null,
      startDetection: jest.fn(),
      stopDetection: jest.fn(),
      updateParameters: jest.fn(),
      getCurrentActivity: jest.fn(),
      getStats: jest.fn()
    });

    render(<RealTimeVoiceInterface {...defaultProps} />);

    // Voice activity indicator should be active (green)
    const voiceActivityIndicator = screen.getByText('Voice Activity').parentElement;
    expect(voiceActivityIndicator?.querySelector('.bg-green-500')).toBeInTheDocument();
  });

  it('displays current transcript when speaking', () => {
    mockUseSpeechToText.mockReturnValue({
      isListening: true,
      transcript: '',
      interimTranscript: 'Hello, this is a test',
      confidence: 0.8,
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      toggleListening: jest.fn(),
      clearTranscript: jest.fn(),
      cleanup: jest.fn()
    });

    render(<RealTimeVoiceInterface {...defaultProps} />);

    expect(screen.getByText('Speaking...')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is a test')).toBeInTheDocument();
  });

  it('handles errors from voice services', () => {
    mockUseVoiceActivityDetection.mockReturnValue({
      isListening: false,
      isVoiceActive: false,
      audioLevel: 0,
      error: 'Failed to access microphone',
      startDetection: jest.fn(),
      stopDetection: jest.fn(),
      updateParameters: jest.fn(),
      getCurrentActivity: jest.fn(),
      getStats: jest.fn()
    });

    mockUseSpeechToText.mockReturnValue({
      isListening: false,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      toggleListening: jest.fn(),
      clearTranscript: jest.fn(),
      cleanup: jest.fn()
    });

    render(<RealTimeVoiceInterface {...defaultProps} />);

    expect(screen.getByText('Voice Service Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to access microphone')).toBeInTheDocument();
  });

  it('cleans up resources on unmount', () => {
    const mockStopVAD = jest.fn();
    const mockCleanupSTT = jest.fn();

    mockUseVoiceActivityDetection.mockReturnValue({
      isListening: false,
      isVoiceActive: false,
      audioLevel: 0,
      error: null,
      startDetection: jest.fn(),
      stopDetection: mockStopVAD,
      updateParameters: jest.fn(),
      getCurrentActivity: jest.fn(),
      getStats: jest.fn()
    });

    mockUseSpeechToText.mockReturnValue({
      isListening: false,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      toggleListening: jest.fn(),
      clearTranscript: jest.fn(),
      cleanup: mockCleanupSTT
    });

    const { unmount } = render(<RealTimeVoiceInterface {...defaultProps} />);

    unmount();

    // Cleanup should be called through useEffect cleanup
    expect(mockStopVAD).toHaveBeenCalled();
    expect(mockCleanupSTT).toHaveBeenCalled();
  });
});
