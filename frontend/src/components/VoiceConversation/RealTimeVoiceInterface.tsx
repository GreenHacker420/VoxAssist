'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Progress,
  Tag,
  Alert,
  Tooltip,
  Row,
  Col,
  Badge
} from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  PhoneOutlined,
  StopOutlined,
  SoundOutlined,
  UserOutlined,
  RobotOutlined,
  SettingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useVoiceActivityDetection } from '@/hooks/useVoiceActivityDetection';
import { useDemoCallWebSocket } from '@/hooks/useDemoCallWebSocket';

// Audio validation utility
const validateAudioData = (bytes: Uint8Array, contentType: string): boolean => {
  if (bytes.length < 10) {
    console.warn('Audio data too small:', bytes.length);
    return false;
  }

  // Check for common audio file signatures
  const header = Array.from(bytes.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('Audio header:', header);

  if (contentType === 'audio/mpeg' || contentType === 'audio/mp3') {
    // Check for MP3 signatures
    // ID3 tag: starts with "ID3" (49 44 33)
    // MPEG frame sync: FF FB, FF FA, FF F3, FF F2
    const hasID3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
    const hasMPEGSync = bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0;

    if (hasID3 || hasMPEGSync) {
      console.log('Valid MP3 audio detected');
      return true;
    }
  }

  if (contentType === 'audio/wav') {
    // WAV signature: "RIFF" (52 49 46 46)
    const hasRIFF = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    if (hasRIFF) {
      console.log('Valid WAV audio detected');
      return true;
    }
  }

  console.warn('Unknown audio format, but allowing playback attempt');
  return true; // Allow unknown formats to attempt playback
};

// Audio level visualization component (unused - keeping for potential future use)
// const AudioLevelIndicator = ({ level, isActive }: { level: number; isActive: boolean }) => (
//   <div className="flex items-center space-x-1">
//     {[...Array(5)].map((_, i) => (
//       <div
//         key={i}
//         className={`w-1 rounded-full transition-all duration-150 ${
//           level > (i + 1) * 20 && isActive
//             ? 'bg-green-500 h-6'
//             : 'bg-gray-300 h-2'
//         }`}
//       />
//     ))}
//   </div>
// );

const { Text, Title } = Typography;

export interface ConversationMessage {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
  confidence?: number;
  isInterim?: boolean;
}

export interface VoiceConversationState {
  status: 'idle' | 'connecting' | 'active' | 'paused' | 'ended';
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  voiceActivity: boolean;
  currentTranscript: string;
  messages: ConversationMessage[];
}

interface RealTimeVoiceInterfaceProps {
  callId?: string;
  onStateChange?: (state: VoiceConversationState) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  showTranscript?: boolean;
  showControls?: boolean;
}

export default function RealTimeVoiceInterface({
  callId,
  onStateChange,
  onError,
  autoStart = false,
  showTranscript = true,
  showControls = true
}: RealTimeVoiceInterfaceProps) {
  const [state, setState] = useState<VoiceConversationState>({
    status: 'idle',
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    voiceActivity: false,
    currentTranscript: '',
    messages: []
  });

  // Remove unused state variables - they're now handled by hooks
  // const [audioLevel, setAudioLevel] = useState(0);
  // const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [, setAudioLevel] = useState(0);
  const [settings] = useState({
    language: 'en-US',
    voiceThreshold: 0.01,
    autoResponse: true,
    showInterimResults: true
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentMessageId = useRef<string>('');

  // Initialize voice activity detection hook
  const {
    isListening: vadIsListening,
    isVoiceActive,
    audioLevel: vadAudioLevel,
    startDetection: startVAD,
    stopDetection: stopVAD,
    error: vadError
  } = useVoiceActivityDetection({
    threshold: settings.voiceThreshold,
    onVoiceStart: () => {
      updateState({ voiceActivity: true });
      currentMessageId.current = '';
    },
    onVoiceEnd: () => {
      updateState({ voiceActivity: false });
    },
    onVoiceActivity: (isActive: boolean, confidence: number) => {
      updateState({ voiceActivity: isActive });
      setAudioLevel(confidence * 100);
    },
    onError: (error) => onError?.(error)
  });

  // Initialize speech-to-text hook
  const {
    isListening: sttIsListening,
    transcript: currentTranscript,
    interimTranscript,
    startListening: startSTT,
    stopListening: stopSTT,
    cleanup: cleanupSTT,
    error: sttError
  } = useSpeechToText({
    continuous: true,
    interimResults: settings.showInterimResults,
    language: settings.language,
    onResult: (result) => {
      const { transcript, confidence, isFinal } = result;

      if (!transcript.trim()) return;

      updateState({ currentTranscript: transcript });

      if (isFinal) {
        // Add final user message
        const messageId = addMessage({
          speaker: 'user',
          text: transcript,
          timestamp: new Date(),
          confidence
        });

        // Clear current transcript
        updateState({ currentTranscript: '', isProcessing: true });

        // Send to AI for processing
        if (settings.autoResponse && callId) {
          sendVoiceInput(transcript, 'text');
        }
      } else if (settings.showInterimResults) {
        // Update or create interim message
        if (currentMessageId.current) {
          updateMessage(currentMessageId.current, {
            text: transcript,
            confidence,
            isInterim: true
          });
        } else {
          currentMessageId.current = addMessage({
            speaker: 'user',
            text: transcript,
            timestamp: new Date(),
            confidence,
            isInterim: true
          });
        }
      }
    },
    onStart: () => updateState({ isListening: true }),
    onEnd: () => updateState({ isListening: false }),
    onError: (error) => onError?.(error)
  });

  // Utility functions - defined first
  const updateState = useCallback((updates: Partial<VoiceConversationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const addMessage = useCallback((message: Omit<ConversationMessage, 'id'>) => {
    const newMessage: ConversationMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));

    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ConversationMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const playAudioResponse = useCallback(async (audioData: string, contentType: string) => {
    try {
      console.log('Starting audio playback process:', {
        audioDataLength: audioData.length,
        contentType
      });

      updateState({ isSpeaking: true });

      // Validate input parameters
      if (!audioData || audioData.length === 0) {
        throw new Error('Audio data is empty or undefined');
      }

      if (!contentType || !contentType.startsWith('audio/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Clean and validate base64 string
      let cleanBase64 = audioData.replace(/[^A-Za-z0-9+/]/g, '');

      // Add padding if necessary
      while (cleanBase64.length % 4) {
        cleanBase64 += '=';
      }

      console.log('Base64 validation:', {
        originalLength: audioData.length,
        cleanedLength: cleanBase64.length,
        expectedBinarySize: Math.floor(cleanBase64.length * 3 / 4)
      });

      // Convert base64 to binary string, then to Uint8Array
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Validate audio data by checking for common audio file headers
      const isValidAudio = validateAudioData(bytes, contentType);
      if (!isValidAudio) {
        throw new Error('Audio data validation failed - invalid audio format');
      }

      const audioBlob = new Blob([bytes], { type: contentType });
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Created audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type,
        url: audioUrl,
        expectedSize: bytes.length,
        sizeMatch: audioBlob.size === bytes.length
      });

      const audio = new Audio(audioUrl);

      audio.onloadstart = () => {
        console.log('Audio loading started');
      };

      audio.oncanplay = () => {
        console.log('Audio can play');
      };

      audio.onended = () => {
        console.log('Audio playback ended');
        updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        const errorDetails = {
          error: e,
          audioError: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          currentSrc: audio.currentSrc
        };
        console.error('Audio playback error:', errorDetails);

        let errorMessage = 'Failed to play audio response';
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Audio playback was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error during audio playback';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio decoding error - invalid audio format';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported by browser';
              break;
            default:
              errorMessage = `Audio error (code ${audio.error.code}): ${audio.error.message}`;
          }
        }

        updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl);
        onError?.(errorMessage);
      };

      console.log('Starting audio playback...');
      await audio.play();
      console.log('Audio play() called successfully');
    } catch (error) {
      console.error('Failed to play audio response:', error);
      updateState({ isSpeaking: false });
      onError?.('Failed to play audio response');
    }
  }, [updateState, onError]);

  // Handler functions - now defined after their dependencies
  const handleVoiceTranscribed = useCallback((data: unknown) => {
    // Handle transcription from WebSocket
    console.log('Voice transcribed:', data);
  }, []);

  const handleAudioResponse = useCallback((audioData: string, transcriptId?: string, contentType?: string) => {
    // Handle AI audio response
    if (audioData && contentType && contentType !== 'text/plain') {
      console.log('Received audio data for playback:', {
        dataLength: audioData.length,
        contentType,
        transcriptId,
        timestamp: Date.now()
      });

      // Start audio playback timing
      const playbackStartTime = Date.now();
      playAudioResponse(audioData, contentType).then(() => {
        const playbackDuration = Date.now() - playbackStartTime;
        console.log('🎵 Audio playback completed:', {
          duration: playbackDuration + 'ms',
          transcriptId,
          status: playbackDuration < 100 ? '🚀 INSTANT' : '✅ NORMAL'
        });
      }).catch(error => {
        console.error('Audio playback failed:', error);
      });
    } else {
      console.log('No audio data to play or text-only response');
    }

    updateState({ isProcessing: false });
  }, [playAudioResponse, updateState]);

  const handleVoiceAnalysis = useCallback((data: unknown) => {
    // Handle voice analysis data
    console.log('Voice analysis:', data);
  }, []);

  // WebSocket connection for real-time communication
  const {
    isConnected,
    connectToCall,
    disconnectFromCall,
    sendVoiceInput,
    transcript: wsTranscript
  } = useDemoCallWebSocket({
    onVoiceTranscribed: handleVoiceTranscribed,
    onAudioResponse: handleAudioResponse,
    onVoiceAnalysis: handleVoiceAnalysis
  });

  // Sync WebSocket transcript with local messages
  useEffect(() => {
    if (wsTranscript && wsTranscript.length > 0) {
      const newMessages = wsTranscript.map(entry => ({
        speaker: entry.speaker as 'user' | 'ai',
        text: entry.text || '',
        timestamp: new Date(entry.timestamp),
        confidence: entry.confidence || 1.0,
        id: entry.id
      }));

      // Update messages state with new transcript entries
      setState(prev => ({
        ...prev,
        messages: newMessages
      }));
    }
  }, [wsTranscript]);

  // Initialize voice services
  useEffect(() => {
    if (autoStart && callId) {
      startConversation();
    }

    return () => {
      cleanup();
    };
  }, [autoStart, callId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Functions moved earlier to resolve dependency issues

  const cleanup = useCallback(() => {
    cleanupSTT();
    stopVAD();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [cleanupSTT, stopVAD]);

  // playAudioResponse function moved earlier to resolve dependency issues

  // These handlers are now managed by the hooks

  const startConversation = useCallback(async () => {
    try {
      updateState({ status: 'connecting' });

      // Connect to WebSocket
      if (callId) {
        connectToCall(callId);
      }

      // Start voice activity detection
      await startVAD();

      // Start speech recognition
      await startSTT();

      updateState({
        status: 'active',
        isListening: true
      });

      // Add welcome message
      addMessage({
        speaker: 'ai',
        text: 'Hello! I\'m ready to have a conversation with you. Please start speaking.',
        timestamp: new Date(),
        confidence: 1.0
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
      onError?.('Failed to start voice conversation');
      updateState({ status: 'idle' });
    }
  }, [callId, connectToCall, startVAD, startSTT, onError, updateState, addMessage]);

  const stopConversation = useCallback(() => {
    cleanup();
    updateState({
      status: 'ended',
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      voiceActivity: false
    });

    if (callId) {
      disconnectFromCall();
    }
  }, [cleanup, updateState, callId, disconnectFromCall]);

  const pauseConversation = useCallback(() => {
    stopSTT();
    stopVAD();
    updateState({
      status: 'paused',
      isListening: false,
      voiceActivity: false
    });
  }, [stopSTT, stopVAD, updateState]);

  const resumeConversation = useCallback(async () => {
    try {
      await startVAD();
      await startSTT();

      updateState({
        status: 'active',
        isListening: true
      });
    } catch (error) {
      console.error('Failed to resume conversation:', error);
      onError?.('Failed to resume voice conversation');
    }
  }, [startVAD, startSTT, updateState, onError]);

  // These functions are now defined earlier with useCallback

  const getStatusColor = () => {
    switch (state.status) {
      case 'active': return 'green';
      case 'connecting': return 'blue';
      case 'paused': return 'orange';
      case 'ended': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case 'active': return 'Active';
      case 'connecting': return 'Connecting';
      case 'paused': return 'Paused';
      case 'ended': return 'Ended';
      default: return 'Ready';
    }
  };

  return (
    <Card className="real-time-voice-interface">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Badge 
            status={state.status === 'active' ? 'processing' : 'default'} 
            text={
              <Title level={4} className="mb-0">
                Voice Conversation
              </Title>
            }
          />
          <Tag color={getStatusColor()}>{getStatusText()}</Tag>
        </div>

        {showControls && (
          <Space>
            {(state.status === 'idle' || state.status === 'connecting') && (
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                onClick={startConversation}
                loading={state.status === 'connecting'}
              >
                Start Conversation
              </Button>
            )}

            {state.status === 'active' && (
              <>
                <Tooltip title="Pause Conversation">
                  <Button
                    icon={<PauseCircleOutlined />}
                    onClick={pauseConversation}
                  />
                </Tooltip>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={stopConversation}
                >
                  End
                </Button>
              </>
            )}

            {state.status === 'paused' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={resumeConversation}
              >
                Resume
              </Button>
            )}

            <Tooltip title="Settings">
              <Button icon={<SettingOutlined />} />
            </Tooltip>
          </Space>
        )}
      </div>

      {/* Status Indicators */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card size="small" className="text-center">
            <div className="flex flex-col items-center">
              {(vadIsListening || sttIsListening) ? (
                <AudioOutlined className="text-green-500 text-xl mb-1" />
              ) : (
                <AudioMutedOutlined className="text-gray-400 text-xl mb-1" />
              )}
              <Text type="secondary" className="text-xs">
                {(vadIsListening || sttIsListening) ? 'Listening' : 'Not Listening'}
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card size="small" className="text-center">
            <div className="flex flex-col items-center">
              {state.isSpeaking ? (
                <SoundOutlined className="text-blue-500 text-xl mb-1" />
              ) : (
                <SoundOutlined className="text-gray-400 text-xl mb-1" />
              )}
              <Text type="secondary" className="text-xs">
                {state.isSpeaking ? 'Speaking' : 'Silent'}
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card size="small" className="text-center">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full mb-1 ${
                isVoiceActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`} />
              <Text type="secondary" className="text-xs">
                Voice Activity
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card size="small" className="text-center">
            <div className="flex flex-col items-center">
              <Progress
                type="circle"
                size={24}
                percent={vadAudioLevel}
                showInfo={false}
                strokeColor={vadAudioLevel > 50 ? '#52c41a' : '#1890ff'}
              />
              <Text type="secondary" className="text-xs">
                Audio Level
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Current Transcript */}
      {(currentTranscript || interimTranscript) && (
        <Alert
          message="Speaking..."
          description={currentTranscript || interimTranscript}
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      {/* Connection Status */}
      {!isConnected && state.status === 'active' && (
        <Alert
          message="Connection Issue"
          description="Trying to reconnect to voice services..."
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {/* Voice Service Errors */}
      {(vadError || sttError) && (
        <Alert
          message="Voice Service Error"
          description={vadError || sttError}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => {
            // Clear errors by restarting services if needed
            if (state.status === 'active') {
              startVAD();
              startSTT();
            }
          }}
        />
      )}

      {/* Conversation Messages */}
      {showTranscript && (
        <div
          className="conversation-messages max-h-96 overflow-y-auto border rounded p-4 bg-gray-50"
          ref={messagesContainerRef}
        >
          {state.messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <SoundOutlined className="text-4xl mb-2" />
              <p>Start speaking to begin the conversation</p>
            </div>
          ) : (
            state.messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-4 ${
                  message.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.speaker === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border'
                  } ${message.isInterim ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center mb-1">
                    {message.speaker === 'user' ? (
                      <UserOutlined className="mr-2" />
                    ) : (
                      <RobotOutlined className="mr-2" />
                    )}
                    <Text
                      className={`text-xs ${
                        message.speaker === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {message.speaker === 'user' ? 'You' : 'AI Assistant'}
                      {message.confidence && (
                        <span className="ml-1">
                          ({Math.round(message.confidence * 100)}%)
                        </span>
                      )}
                    </Text>
                  </div>
                  <p className="mb-0">{message.text}</p>
                  <Text
                    className={`text-xs ${
                      message.speaker === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Text>
                </div>
              </div>
            ))
          )}
          {/* end sentinel removed; we now scroll the container directly */}
        </div>
      )}

      {/* Processing Indicator */}
      {state.isProcessing && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <Text type="secondary">AI is thinking...</Text>
          </div>
        </div>
      )}
    </Card>
  );
}
