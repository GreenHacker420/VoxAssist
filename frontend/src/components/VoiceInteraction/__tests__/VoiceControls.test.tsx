import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceControls from '../VoiceControls';

// Mock Ant Design components
jest.mock('antd', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Tooltip: ({ children, title }: any) => (
    <div title={title}>{children}</div>
  ),
  Space: ({ children }: any) => <div>{children}</div>,
  Badge: ({ text, status }: any) => <span data-status={status}>{text}</span>
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  MicrophoneIcon: () => <div data-testid="microphone-icon" />,
  SpeakerWaveIcon: () => <div data-testid="speaker-icon" />,
  StopIcon: () => <div data-testid="stop-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />
}));

describe('VoiceControls', () => {
  const defaultProps = {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    isSupported: true,
    error: null,
    onToggleListening: jest.fn(),
    onClearError: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when supported', () => {
    render(<VoiceControls {...defaultProps} />);
    
    expect(screen.getByTestId('microphone-icon')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows unsupported message when speech recognition is not supported', () => {
    render(<VoiceControls {...defaultProps} isSupported={false} />);
    
    expect(screen.getByText('Speech Recognition Not Supported')).toBeInTheDocument();
    expect(screen.getByText(/Your browser doesn't support speech recognition/)).toBeInTheDocument();
  });

  it('calls onToggleListening when microphone button is clicked', () => {
    const onToggleListening = jest.fn();
    render(<VoiceControls {...defaultProps} onToggleListening={onToggleListening} />);
    
    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);
    
    expect(onToggleListening).toHaveBeenCalledTimes(1);
  });

  it('shows listening status when listening', () => {
    render(<VoiceControls {...defaultProps} isListening={true} />);
    
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('shows processing status when processing', () => {
    render(<VoiceControls {...defaultProps} isProcessing={true} />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows speaking status when AI is speaking', () => {
    render(<VoiceControls {...defaultProps} isSpeaking={true} />);
    
    expect(screen.getByText('AI Speaking...')).toBeInTheDocument();
  });

  it('displays error message and clear button when error exists', () => {
    const error = 'Microphone access denied';
    const onClearError = jest.fn();
    
    render(
      <VoiceControls 
        {...defaultProps} 
        error={error} 
        onClearError={onClearError} 
      />
    );
    
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Clear'));
    expect(onClearError).toHaveBeenCalledTimes(1);
  });

  it('disables microphone button when disabled prop is true', () => {
    render(<VoiceControls {...defaultProps} disabled={true} />);
    
    const micButton = screen.getByRole('button');
    expect(micButton).toBeDisabled();
  });

  it('shows voice activity indicators when listening', () => {
    render(<VoiceControls {...defaultProps} isListening={true} />);
    
    // Check for animated dots (voice activity indicators)
    const dots = screen.getAllByText('', { selector: '.animate-pulse' });
    expect(dots.length).toBeGreaterThan(0);
  });

  it('shows processing indicators when processing', () => {
    render(<VoiceControls {...defaultProps} isProcessing={true} />);
    
    // Check for animated dots (processing indicators)
    const dots = screen.getAllByText('', { selector: '.animate-bounce' });
    expect(dots.length).toBeGreaterThan(0);
  });

  it('shows speaking indicators when AI is speaking', () => {
    render(<VoiceControls {...defaultProps} isSpeaking={true} />);
    
    expect(screen.getByText('Playing Response')).toBeInTheDocument();
  });

  it('applies correct CSS classes based on status', () => {
    const { rerender } = render(<VoiceControls {...defaultProps} />);
    
    // Test idle state
    expect(screen.getByText('Ready')).toHaveClass('text-gray-600');
    
    // Test listening state
    rerender(<VoiceControls {...defaultProps} isListening={true} />);
    expect(screen.getByText('Listening...')).toHaveClass('text-green-600');
    
    // Test processing state
    rerender(<VoiceControls {...defaultProps} isProcessing={true} />);
    expect(screen.getByText('Processing...')).toHaveClass('text-blue-600');
    
    // Test error state
    rerender(<VoiceControls {...defaultProps} error="Test error" />);
    expect(screen.getByText('Error')).toHaveClass('text-red-600');
  });
});
