'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Progress,
  Avatar,
  Divider,
  Alert,
  Spin,
  Row,
  Col,
  Badge
} from 'antd';
import {
  PhoneOutlined,
  StopOutlined,
  SoundOutlined,
  UserOutlined,
  RobotOutlined,
  FrownOutlined,
  SmileOutlined,
  MehOutlined,
  AudioOutlined,
  AudioMutedOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { CallsService } from '@/services/calls';
import { useDemoCallWebSocket } from '@/hooks/useDemoCallWebSocket';
import { ttsService } from '@/services/ttsService';
import VoiceInputButton from './VoiceInputButton';
import VoiceAnalysisDisplay, { VoiceAnalysisData } from './VoiceAnalysisDisplay';

const { Text } = Typography;

interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'ai' | 'agent';
  text: string;
  timestamp: string;
  confidence?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

interface SentimentData {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
  };
}

export default function DemoCallInterface() {
  const { isDemoMode } = useAuth();
  const [callDuration, setCallDuration] = useState(0);
  const [isCustomerTalking, setIsCustomerTalking] = useState(false);
  const [isAiTalking, setIsAiTalking] = useState(false);
  const [callId, setCallId] = useState<string>('');
  const [useBackendDemo, setUseBackendDemo] = useState(true);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [currentVoiceAnalysis, setCurrentVoiceAnalysis] = useState<VoiceAnalysisData | null>(null);
  const [lastTranscription, setLastTranscription] = useState<{ text: string; confidence: number } | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle TTS audio responses
  const handleAudioResponse = async (audioUrl: string, transcriptId?: string) => {
    if (!isTTSEnabled) {
      console.log('TTS disabled, skipping audio playback');
      return;
    }

    console.log('Received audio response:', { audioUrl, transcriptId });

    // Find the corresponding transcript entry for context
    const transcriptEntry = wsTranscript.find(entry => entry.id === transcriptId);
    const text = transcriptEntry?.text || 'AI Response';

    try {
      await ttsService.queueAudio(audioUrl, transcriptId, text, {
        volume: ttsVolume,
        autoPlay: true,
        onPlay: () => {
          console.log('TTS playback started for:', text);
          setIsAiTalking(true);
        },
        onEnded: () => {
          console.log('TTS playback ended for:', text);
          setIsAiTalking(false);
        },
        onError: (error) => {
          console.error('TTS playback error:', error);
          setIsAiTalking(false);
        }
      });
    } catch (error) {
      console.error('Error queueing TTS audio:', error);
    }
  };

  // Handle TTS audio streaming (WebSocket-based)
  const handleAudioStream = async (audioData: string, transcriptId?: string, metadata?: { speaker?: string; messageId?: string; text?: string; format?: string }) => {
    if (!isTTSEnabled) {
      console.log('TTS disabled, skipping audio stream playback');
      return;
    }

    console.log('Received audio stream:', { size: audioData.length, transcriptId, metadata });

    // Find the corresponding transcript entry for context
    const transcriptEntry = wsTranscript.find(entry => entry.id === transcriptId);
    const text = transcriptEntry?.text || metadata?.text || 'AI Response';

    try {
      const format = metadata?.format || 'mp3';
      await ttsService.queueAudioData(audioData, transcriptId, text, format, {
        volume: ttsVolume,
        autoPlay: true,
        onPlay: () => {
          console.log('TTS stream playback started for:', text);
          setIsAiTalking(true);
        },
        onEnded: () => {
          console.log('TTS stream playback ended for:', text);
          setIsAiTalking(false);
        },
        onError: (error) => {
          console.error('TTS stream playback error:', error);
          setIsAiTalking(false);
        }
      });
    } catch (error) {
      console.error('Error queueing TTS audio stream:', error);
    }
  };

  // Handle voice transcription results
  const handleVoiceTranscribed = (transcript: string) => {
    console.log('Voice transcribed:', transcript);
    // The transcript will be automatically added to the conversation via WebSocket
  };

  // Handle comprehensive voice analysis results
  const handleVoiceAnalysis = (analysis: VoiceAnalysisData) => {
    console.log('Voice analysis received:', analysis);
    setCurrentVoiceAnalysis(analysis);

    // Extract transcription info if available - analysis contains the data directly
    // The transcription will be handled separately via transcript updates
  };

  // Handle voice input from user
  const handleVoiceInput = (audioData: string, format: string, metrics?: { volume: number; clarity: number; duration: number; sampleRate: number; bitRate: number }) => {
    console.log('Sending voice input:', { format, size: audioData.length, metrics });
    sendVoiceInput(audioData, format);
  };

  // Use WebSocket hook for real-time demo call features
  const {
    isConnected: wsConnected,
    transcript: wsTranscript,
    currentSentiment: wsSentiment,
    callStatus: wsCallStatus,
    error: wsError,
    connectToCall,
    disconnectFromCall,
    sendVoiceInput
  } = useDemoCallWebSocket({
    onAudioResponse: handleAudioResponse,
    onAudioStream: handleAudioStream,
    onVoiceTranscribed: handleVoiceTranscribed,
    onVoiceAnalysis: handleVoiceAnalysis
  });

  // Local state for fallback mode
  const [localCallStatus, setLocalCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [localTranscript, setLocalTranscript] = useState<TranscriptEntry[]>([]);
  const [localSentiment, setLocalSentiment] = useState<SentimentData>({
    overall: 'neutral',
    score: 0.5,
    emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0 }
  });

  // Debug logging
  useEffect(() => {
    console.log('DemoCallInterface state:', {
      isDemoMode,
      useBackendDemo,
      wsConnected,
      wsCallStatus,
      localCallStatus,
      wsError
    });
  }, [isDemoMode, useBackendDemo, wsConnected, wsCallStatus, localCallStatus, wsError]);

  // Use WebSocket data when available, fallback to local state
  const callStatus = useBackendDemo ? wsCallStatus : localCallStatus;
  const transcript = useBackendDemo ? wsTranscript : localTranscript;
  const currentSentiment = useBackendDemo ? wsSentiment : localSentiment;

  // Sample demo conversation data
  const demoConversation = [
    {
      speaker: 'ai' as const,
      text: "Hello! I'm VoxAssist, your AI support agent. How can I help you today?",
      sentiment: 'positive' as const,
      sentimentScore: 0.8
    },
    {
      speaker: 'customer' as const,
      text: "Hi, I'm having trouble with my account login. I can't seem to access my dashboard.",
      sentiment: 'negative' as const,
      sentimentScore: 0.3
    },
    {
      speaker: 'ai' as const,
      text: "I understand your frustration with the login issue. Let me help you resolve this. Can you tell me what error message you're seeing?",
      sentiment: 'positive' as const,
      sentimentScore: 0.7
    },
    {
      speaker: 'customer' as const,
      text: "It says 'Invalid credentials' but I'm sure I'm using the right password.",
      sentiment: 'negative' as const,
      sentimentScore: 0.4
    },
    {
      speaker: 'ai' as const,
      text: "That's definitely frustrating. Let me check your account status. I can see there might be a temporary lock. I'll reset it for you right now.",
      sentiment: 'positive' as const,
      sentimentScore: 0.8
    },
    {
      speaker: 'customer' as const,
      text: "Oh great! That would be really helpful. Thank you so much.",
      sentiment: 'positive' as const,
      sentimentScore: 0.9
    },
    {
      speaker: 'ai' as const,
      text: "Perfect! I've reset your account. You should be able to log in now. Is there anything else I can help you with today?",
      sentiment: 'positive' as const,
      sentimentScore: 0.9
    },
    {
      speaker: 'customer' as const,
      text: "That worked perfectly! You've been incredibly helpful. Thank you!",
      sentiment: 'positive' as const,
      sentimentScore: 0.95
    }
  ];

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Initialize TTS settings
  useEffect(() => {
    ttsService.setVolume(ttsVolume);
    ttsService.setMuted(!isTTSEnabled);
  }, [ttsVolume, isTTSEnabled]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'active') {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [callStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop TTS playback and clear queue
      ttsService.stop();
    };
  }, []);

  const startDemoCall = async () => {
    if (!isDemoMode) {
      return;
    }

    setCallDuration(0);

    try {
      if (useBackendDemo) {
        console.log('Starting backend demo call...');
        // Use backend demo call service
        const demoCall = await CallsService.initiateInteractiveDemoCall();
        console.log('Demo call created:', demoCall);
        setCallId(demoCall.id);

        // Connect to WebSocket for real-time updates
        console.log('Connecting to WebSocket for call:', demoCall.id);
        connectToCall(demoCall.id);
      } else {
        // Fallback to frontend simulation
        console.log('Starting frontend simulation...');
        startFrontendSimulation();
      }
    } catch (error) {
      console.error('Failed to start demo call via backend, falling back to frontend simulation:', error);

      // Fallback to frontend simulation
      setUseBackendDemo(false);
      startFrontendSimulation();
    }
  };

  const startFrontendSimulation = () => {
    setLocalCallStatus('connecting');
    setLocalTranscript([]);

    const newCallId = `demo-call-${Date.now()}`;
    setCallId(newCallId);

    // Simulate connection delay
    setTimeout(() => {
      setLocalCallStatus('active');
      simulateConversation();
    }, 2000);
  };

  const endDemoCall = async () => {
    setIsCustomerTalking(false);
    setIsAiTalking(false);

    // Stop TTS playback immediately
    ttsService.stop();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    try {
      if (useBackendDemo && callId) {
        // End demo call via backend
        await CallsService.endDemoCall(callId);
        disconnectFromCall();
      } else {
        // End local simulation
        setLocalCallStatus('ended');
      }
    } catch (error) {
      console.error('Failed to end demo call:', error);
      // Force local end
      setLocalCallStatus('ended');
      disconnectFromCall();
    }
  };

  const simulateConversation = () => {
    let messageIndex = 0;
    
    const addMessage = () => {
      if (messageIndex >= demoConversation.length || callStatus === 'ended') {
        return;
      }

      const message = demoConversation[messageIndex];
      const newEntry: TranscriptEntry = {
        id: `msg-${Date.now()}-${messageIndex}`,
        speaker: message.speaker,
        text: message.text,
        timestamp: new Date().toISOString(),
        confidence: 0.85 + Math.random() * 0.1,
        sentiment: message.sentiment,
        sentimentScore: message.sentimentScore
      };

      setLocalTranscript(prev => [...prev, newEntry]);

      // Update talking indicators
      if (message.speaker === 'customer') {
        setIsCustomerTalking(true);
        setTimeout(() => setIsCustomerTalking(false), 2000);
      } else {
        setIsAiTalking(true);
        setTimeout(() => setIsAiTalking(false), 2000);
      }

      // Update sentiment
      setLocalSentiment(prev => ({
        ...prev,
        overall: message.sentiment,
        score: message.sentimentScore,
        emotions: {
          joy: message.sentiment === 'positive' ? 0.8 : 0.2,
          anger: message.sentiment === 'negative' ? 0.6 : 0.1,
          fear: message.sentiment === 'negative' ? 0.3 : 0.1,
          sadness: message.sentiment === 'negative' ? 0.4 : 0.1,
          surprise: 0.2
        }
      }));

      messageIndex++;
      
      // Schedule next message
      if (messageIndex < demoConversation.length) {
        setTimeout(addMessage, 3000 + Math.random() * 2000);
      } else {
        // End call after last message
        setTimeout(() => {
          endDemoCall();
        }, 3000);
      }
    };

    // Start the conversation
    setTimeout(addMessage, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <SmileOutlined style={{ color: '#52c41a' }} />;
      case 'negative':
        return <FrownOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <MehOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#52c41a';
      case 'negative':
        return '#ff4d4f';
      default:
        return '#faad14';
    }
  };

  return (
    <Card title="Demo Call Interface" className="w-full">
      <Row gutter={[16, 16]}>
        {/* Call Controls */}
        <Col xs={24} lg={8}>
          <Card size="small" title="Call Controls">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Badge 
                  status={callStatus === 'active' ? 'processing' : callStatus === 'connecting' ? 'warning' : 'default'} 
                  text={callStatus.toUpperCase()}
                />
              </div>
              
              {callStatus === 'idle' && (
                <Button
                  type="primary"
                  icon={<PhoneOutlined />}
                  onClick={startDemoCall}
                  block
                  size="large"
                  disabled={!isDemoMode}
                >
                  Start Demo Call
                </Button>
              )}

              {callStatus === 'connecting' && (
                <div style={{ textAlign: 'center' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 8 }}>Connecting...</div>
                </div>
              )}

              {callStatus === 'active' && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                    {formatDuration(callDuration)}
                  </div>

                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <VoiceInputButton
                      onVoiceInput={handleVoiceInput}
                      disabled={!useBackendDemo || !wsConnected}
                      className="demo-voice-input"
                    />

                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={endDemoCall}
                      block
                      size="large"
                    >
                      End Call
                    </Button>
                  </Space>
                </>
              )}

              {callStatus === 'ended' && (
                <>
                  <Alert
                    message="Call Ended"
                    description={`Total duration: ${formatDuration(callDuration)}`}
                    type="success"
                    showIcon
                  />
                  <Button
                    type="primary"
                    icon={<PhoneOutlined />}
                    onClick={startDemoCall}
                    block
                  >
                    Start New Demo Call
                  </Button>
                </>
              )}

              {!isDemoMode && (
                <Alert
                  message="Demo Mode Required"
                  description="Please enable demo mode to use this feature"
                  type="warning"
                  showIcon
                />
              )}

              {/* TTS Controls */}
              <Divider />
              <div>
                <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                  Voice Settings
                </Text>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text>Text-to-Speech</Text>
                    <Button
                      type={isTTSEnabled ? 'primary' : 'default'}
                      icon={isTTSEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                      onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                      size="small"
                    >
                      {isTTSEnabled ? 'On' : 'Off'}
                    </Button>
                  </div>
                  {isTTSEnabled && (
                    <div>
                      <Text style={{ fontSize: '12px', color: '#666' }}>Volume: {Math.round(ttsVolume * 100)}%</Text>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={ttsVolume}
                        onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                        style={{ width: '100%', marginTop: '4px' }}
                      />
                    </div>
                  )}
                </Space>
              </div>
            </Space>
          </Card>

          {/* Sentiment Analysis */}
          <Card size="small" title="Real-time Sentiment" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: 8 }}>
                  {getSentimentIcon(currentSentiment.overall)}
                </div>
                <Tag color={getSentimentColor(currentSentiment.overall)}>
                  {currentSentiment.overall.toUpperCase()}
                </Tag>
                <div style={{ marginTop: 8 }}>
                  Score: {(currentSentiment.score * 100).toFixed(0)}%
                </div>
              </div>
              
              <Divider />
              
              <div>
                <Text strong>Emotion Breakdown:</Text>
                {Object.entries(currentSentiment.emotions).map(([emotion, value]) => (
                  <div key={emotion} style={{ marginTop: 4 }}>
                    <Text style={{ textTransform: 'capitalize' }}>{emotion}:</Text>
                    <Progress 
                      percent={Math.round(value * 100)} 
                      size="small" 
                      showInfo={false}
                      strokeColor={getSentimentColor(value > 0.5 ? 'positive' : value > 0.3 ? 'neutral' : 'negative')}
                    />
                  </div>
                ))}
              </div>
            </Space>
          </Card>
        </Col>

        {/* Real-time Transcript */}
        <Col xs={24} lg={16}>
          <Card 
            size="small" 
            title={
              <Space>
                <span>Live Transcript</span>
                {(isCustomerTalking || isAiTalking) && (
                  <Badge status="processing" text={isCustomerTalking ? "Customer Speaking" : "AI Speaking"} />
                )}
              </Space>
            }
          >
            <div 
              ref={transcriptRef}
              style={{ 
                height: '400px', 
                overflowY: 'auto', 
                border: '1px solid #f0f0f0', 
                borderRadius: '6px',
                padding: '12px',
                backgroundColor: '#fafafa'
              }}
            >
              {transcript.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: '150px' }}>
                  <SoundOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>Transcript will appear here during the call</div>
                </div>
              ) : (
                transcript.map((entry) => (
                  <div key={entry.id} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <Avatar 
                        size="small" 
                        icon={entry.speaker === 'customer' ? <UserOutlined /> : <RobotOutlined />}
                        style={{ 
                          backgroundColor: entry.speaker === 'customer' ? '#1890ff' : '#52c41a',
                          marginRight: '8px'
                        }}
                      />
                      <Text strong style={{ textTransform: 'capitalize' }}>
                        {entry.speaker === 'customer' ? 'Customer' : 'AI Assistant'}
                      </Text>
                      <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </Text>
                      {entry.sentiment && (
                        <span style={{ marginLeft: '8px' }}>
                          {getSentimentIcon(entry.sentiment)}
                        </span>
                      )}
                    </div>
                    <div 
                      style={{ 
                        backgroundColor: 'white',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        marginLeft: '32px',
                        border: `2px solid ${entry.speaker === 'customer' ? '#e6f7ff' : '#f6ffed'}`
                      }}
                    >
                      <Text>{entry.text}</Text>
                      {entry.confidence && (
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            Confidence: {(entry.confidence * 100).toFixed(0)}%
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Voice Analysis Display */}
      {currentVoiceAnalysis && (
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <VoiceAnalysisDisplay
              analysis={currentVoiceAnalysis}
              transcription={lastTranscription || undefined}
              className="voice-analysis-display"
            />
          </Col>
        </Row>
      )}
    </Card>
  );
}
