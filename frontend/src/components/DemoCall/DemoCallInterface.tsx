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
import VoiceInputButton from './VoiceInputButton';
import VoiceAnalysisDisplay, { VoiceAnalysisData } from './VoiceAnalysisDisplay';

const { Text } = Typography;

interface TranscriptEntry {
  speaker: 'customer' | 'ai';
  text: string;
  timestamp: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
}

interface SentimentData {
  overall: 'positive' | 'negative' | 'neutral';
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
  const { user } = useAuth();
  const [callDuration, setCallDuration] = useState(0);
  const [isCustomerTalking, setIsCustomerTalking] = useState(false);
  const [isAiTalking, setIsAiTalking] = useState(false);
  const [callId, setCallId] = useState<string>('');
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentData>({
    overall: 'neutral',
    score: 0.5,
    emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
  });
  const [currentVoiceAnalysis, setCurrentVoiceAnalysis] = useState<VoiceAnalysisData | null>(null);
  const [lastTranscription, setLastTranscription] = useState<{ text: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (callStatus === 'active' && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (callStatus !== 'active' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [callStatus]);

  const formatDuration = (seconds: number): string => {
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

  const startDemoCall = async () => {
    if (!user) {
      setError('Please log in to start a demo call');
      return;
    }

    setCallStatus('connecting');
    setError(null);
    setTranscript([]);
    setCallDuration(0);

    try {
      console.log('Starting demo call...');
      const demoCall = await CallsService.startDemoCall();
      console.log('Demo call created:', demoCall);
      setCallId(demoCall.id);
      setCallStatus('active');

      // Add initial greeting to transcript
      setTranscript([{
        speaker: 'ai',
        text: 'Hello! This is a demo call. How can I help you today?',
        timestamp: new Date().toISOString(),
        sentiment: 'positive',
        confidence: 0.95
      }]);

    } catch (error) {
      console.error('Failed to start demo call:', error);
      setError('Failed to start demo call. Please try again.');
      setCallStatus('idle');
    }
  };

  const endDemoCall = async () => {
    setIsCustomerTalking(false);
    setIsAiTalking(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    try {
      if (callId) {
        await CallsService.endDemoCall(callId);
      }
      setCallStatus('ended');
    } catch (error) {
      console.error('Failed to end demo call:', error);
      setCallStatus('ended');
    }
  };

  const handleVoiceInput = async (audioBlob: Blob, analysis: VoiceAnalysisData) => {
    if (callStatus !== 'active' || !callId) return;

    setIsCustomerTalking(true);
    setCurrentVoiceAnalysis(analysis);

    try {
      // Process voice input
      const result = await CallsService.processVoiceInput(callId, audioBlob, analysis as unknown as Record<string, unknown>);
      
      if (result.transcript) {
        // Add customer message to transcript
        const customerEntry: TranscriptEntry = {
          speaker: 'customer',
          text: result.transcript,
          timestamp: new Date().toISOString(),
          sentiment: (result.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
          confidence: result.confidence || 0.8
        };
        
        setTranscript(prev => [...prev, customerEntry]);
        setLastTranscription({ text: result.transcript, confidence: result.confidence || 0.8 });

        // Update sentiment
        if (result.sentimentData) {
          setCurrentSentiment(result.sentimentData as unknown as SentimentData);
        }

        // Add AI response if available
        if (result.aiResponse) {
          setIsAiTalking(true);
          
          setTimeout(() => {
            const aiEntry: TranscriptEntry = {
              speaker: 'ai',
              text: result.aiResponse,
              timestamp: new Date().toISOString(),
              sentiment: 'neutral',
              confidence: 0.95
            };
            
            setTranscript(prev => [...prev, aiEntry]);
            setIsAiTalking(false);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to process voice input:', error);
    } finally {
      setIsCustomerTalking(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <Alert
          message="Authentication Required"
          description="Please log in to access the demo call feature."
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div className="demo-call-interface">
      <Row gutter={[16, 16]}>
        {/* Call Controls */}
        <Col xs={24} lg={8}>
          <Card title="Call Controls" className="h-full">
            <Space direction="vertical" className="w-full" size="large">
              {/* Call Status */}
              <div className="text-center">
                <Badge 
                  status={callStatus === 'active' ? 'processing' : callStatus === 'ended' ? 'success' : 'default'} 
                  text={callStatus.charAt(0).toUpperCase() + callStatus.slice(1)}
                />
                <div className="text-2xl font-mono mt-2">
                  {formatDuration(callDuration)}
                </div>
              </div>

              {/* Call Buttons */}
              <div className="text-center space-y-3">
                {callStatus === 'idle' && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PhoneOutlined />}
                    onClick={startDemoCall}
                    className="w-full"
                  >
                    Start Demo Call
                  </Button>
                )}

                {callStatus === 'active' && (
                  <>
                    <VoiceInputButton
                      onVoiceInput={handleVoiceInput}
                      disabled={isCustomerTalking || isAiTalking}
                      className="w-full"
                    />
                    <Button
                      danger
                      size="large"
                      icon={<StopOutlined />}
                      onClick={endDemoCall}
                      className="w-full"
                    >
                      End Call
                    </Button>
                  </>
                )}

                {callStatus === 'ended' && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PhoneOutlined />}
                    onClick={startDemoCall}
                    className="w-full"
                  >
                    Start New Demo Call
                  </Button>
                )}
              </div>

              {/* Voice Status */}
              {callStatus === 'active' && (
                <div className="text-center">
                  <Space direction="vertical" size="small">
                    <div className="flex justify-center items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Avatar size="small" icon={<UserOutlined />} />
                        <span className="text-sm">Customer</span>
                        {isCustomerTalking ? (
                          <AudioOutlined className="text-green-500 animate-pulse" />
                        ) : (
                          <AudioMutedOutlined className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar size="small" icon={<RobotOutlined />} />
                        <span className="text-sm">AI</span>
                        {isAiTalking ? (
                          <AudioOutlined className="text-blue-500 animate-pulse" />
                        ) : (
                          <AudioMutedOutlined className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </Space>
                </div>
              )}

              {error && (
                <Alert
                  message="Error"
                  description={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                />
              )}
            </Space>
          </Card>
        </Col>

        {/* Transcript */}
        <Col xs={24} lg={8}>
          <Card title="Live Transcript" className="h-full">
            <div className="transcript-container max-h-96 overflow-y-auto space-y-3">
              {transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`flex ${entry.speaker === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      entry.speaker === 'customer'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Avatar
                        size="small"
                        icon={entry.speaker === 'customer' ? <UserOutlined /> : <RobotOutlined />}
                      />
                      <span className="text-xs opacity-75">
                        {entry.speaker === 'customer' ? 'You' : 'AI Assistant'}
                      </span>
                      {entry.sentiment && getSentimentIcon(entry.sentiment)}
                    </div>
                    <div className="text-sm">{entry.text}</div>
                    {entry.confidence && (
                      <div className="text-xs opacity-75 mt-1">
                        Confidence: {Math.round(entry.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {transcript.length === 0 && callStatus === 'active' && (
                <div className="text-center text-gray-500 py-8">
                  <SoundOutlined className="text-2xl mb-2" />
                  <div>Start speaking to see the transcript...</div>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Analysis */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" className="w-full" size="middle">
            {/* Sentiment Analysis */}
            <Card title="Sentiment Analysis" size="small">
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {getSentimentIcon(currentSentiment.overall)}
                </div>
                <div className="text-lg font-semibold mb-2">
                  {currentSentiment.overall.charAt(0).toUpperCase() + currentSentiment.overall.slice(1)}
                </div>
                <Progress
                  percent={Math.round(currentSentiment.score * 100)}
                  strokeColor={getSentimentColor(currentSentiment.overall)}
                  size="small"
                />
              </div>
            </Card>

            {/* Voice Analysis */}
            {currentVoiceAnalysis && (
              <VoiceAnalysisDisplay analysis={currentVoiceAnalysis} />
            )}

            {/* Last Transcription */}
            {lastTranscription && (
              <Card title="Last Transcription" size="small">
                <div className="space-y-2">
                  <div className="text-sm">{lastTranscription.text}</div>
                  <div className="text-xs text-gray-500">
                    Confidence: {Math.round(lastTranscription.confidence * 100)}%
                  </div>
                </div>
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
}
