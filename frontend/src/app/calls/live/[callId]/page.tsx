'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { CallsService } from '@/services/calls';
import { Call } from '@/types';
import { formatDate, formatDuration } from '@/lib/utils';
import {
  PhoneIcon,
  StopIcon,
  UserIcon,
  HandRaisedIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Waveform from '@/components/Call/Waveform';

interface TranscriptMessage {
  id: string;
  speaker: 'customer' | 'ai' | 'agent';
  text: string;
  timestamp: string;
  confidence?: number;
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

export default function LiveCallPage() {
  const params = useParams();
  const callId = params.callId as string;
  
  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [isHandedOff, setIsHandedOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCustomerTalking, setIsCustomerTalking] = useState(false);
  const [isAiTalking, setIsAiTalking] = useState(false);
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadCallData();
    connectWebSocket();
    
    // Update call duration every second
    const durationInterval = setInterval(() => {
      if (call?.status === 'active') {
        const startTime = new Date(call.startTime).getTime();
        const now = new Date().getTime();
        setCallDuration(Math.floor((now - startTime) / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(durationInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [callId]);

  useEffect(() => {
    // Auto-scroll transcript to bottom
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const loadCallData = async () => {
    try {
      const callData = await CallsService.getCall(callId);
      setCall(callData);
    } catch (error) {
      console.error('Failed to load call data:', error);
      toast.error('Failed to load call data');
    } finally {
      setIsLoading(false);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = `ws://localhost:3001/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected for call:', callId);
      // Join the call room
      ws.send(JSON.stringify({
        type: 'join_call',
        callId: callId,
        token: localStorage.getItem('token')
      }));
      
      // Start simulated transcript for demo
      setTimeout(() => {
        simulateTranscriptData();
      }, 2000);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transcript_update':
          setTranscript(prev => [...prev, data.message]);
          if (data.message.speaker === 'customer') {
            setIsCustomerTalking(true);
            setTimeout(() => setIsCustomerTalking(false), 1500);
          } else {
            setIsAiTalking(true);
            setTimeout(() => setIsAiTalking(false), 1500);
          }
          break;
        case 'sentiment_update':
          setSentiment(data.sentiment);
          break;
        case 'call_status_update':
          setCall(prev => prev ? { ...prev, status: data.status } : null);
          break;
        case 'joined_call':
          console.log('Successfully joined call monitoring');
          break;
        case 'handoff_completed':
          setIsHandedOff(true);
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (call?.status === 'active') {
          connectWebSocket();
        }
      }, 3000);
    };
    
    wsRef.current = ws;
  };

  const simulateTranscriptData = () => {
    const sampleMessages: TranscriptMessage[] = [
      { id: '', speaker: 'customer', text: 'Hello, I need help with my account.', confidence: 0.95, timestamp: '' },
      { id: '', speaker: 'ai', text: 'Hello! I\'d be happy to help you with your account. Can you please provide your account number?', confidence: 1.0, timestamp: '' },
      { id: '', speaker: 'customer', text: 'Sure, it\'s 12345678.', confidence: 0.92, timestamp: '' },
      { id: '', speaker: 'ai', text: 'Thank you. I can see your account here. What specific issue are you experiencing?', confidence: 1.0, timestamp: '' },
      { id: '', speaker: 'customer', text: 'I can\'t access my online banking. It keeps saying my password is wrong.', confidence: 0.88, timestamp: '' }
    ];
    
    const sampleSentiments: SentimentData[] = [
      { overall: 'neutral', score: 0.6, emotions: { joy: 0.1, anger: 0.2, fear: 0.3, sadness: 0.1, surprise: 0.3 } },
      { overall: 'positive', score: 0.7, emotions: { joy: 0.4, anger: 0.1, fear: 0.2, sadness: 0.1, surprise: 0.2 } },
      { overall: 'negative', score: 0.3, emotions: { joy: 0.1, anger: 0.4, fear: 0.2, sadness: 0.2, surprise: 0.1 } }
    ];
    
    let messageIndex = 0;
    let sentimentIndex = 0;
    
    const interval = setInterval(() => {
      if (messageIndex < sampleMessages.length) {
        const message: TranscriptMessage = {
          ...sampleMessages[messageIndex],
          id: `msg-${Date.now()}-${messageIndex}`,
          timestamp: new Date().toISOString()
        };
        
        setTranscript(prev => [...prev, message]);
        
        if (message.speaker === 'customer') {
          setIsCustomerTalking(true);
          setTimeout(() => setIsCustomerTalking(false), 2000);
        } else {
          setIsAiTalking(true);
          setTimeout(() => setIsAiTalking(false), 2000);
        }

        // Update sentiment every 2 messages
        if (messageIndex % 2 === 0 && sentimentIndex < sampleSentiments.length) {
          setTimeout(() => {
            setSentiment(sampleSentiments[sentimentIndex]);
            sentimentIndex++;
          }, 1000);
        }
        
        messageIndex++;
      } else {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleHandoffToHuman = async () => {
    try {
      setIsConnecting(true);
      await CallsService.handoffToHuman(callId);
      setIsHandedOff(true);
      toast.success('Call handed off to human agent');
    } catch (error) {
      console.error('Failed to handoff call:', error);
      toast.error('Failed to handoff call');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    try {
      await CallsService.endCall(callId);
      setCall(prev => prev ? { ...prev, status: 'completed' } : null);
      toast.success('Call ended successfully');
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return <PhoneIcon className="h-4 w-4" />;
      case 'agent':
        return <UserIcon className="h-4 w-4" />;
      default:
        return <SpeakerWaveIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!call) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Call not found</h2>
          <p className="mt-2 text-gray-600">The requested call could not be found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Call Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Live Call: {call.customerPhone}
              </h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span>Started: {formatDate(call.startTime)}</span>
                <span>Duration: {formatDuration(callDuration)}</span>
                <span className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  call.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                )}>
                  {call.status}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {call.status === 'active' && !isHandedOff && (
                <Button
                  onClick={handleHandoffToHuman}
                  isLoading={isConnecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <HandRaisedIcon className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Handoff to Human'}
                </Button>
              )}
              
              {call.status === 'active' && (
                <Button
                  onClick={handleEndCall}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <StopIcon className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Transcript */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Live Transcript</h2>
            </div>
            <div 
              ref={transcriptRef}
              className="p-6 h-96 overflow-y-auto space-y-4"
            >
              {transcript.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MicrophoneIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p>Waiting for conversation to start...</p>
                </div>
              ) : (
                transcript.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      message.speaker === 'customer' ? 'bg-blue-100 text-blue-600' :
                      message.speaker === 'agent' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    )}>
                      {getSpeakerIcon(message.speaker)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {message.speaker}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        {message.confidence && (
                          <span className="text-xs text-gray-400">
                            ({Math.round(message.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{message.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sentiment & Controls */}
          <div className="space-y-6">
            {/* Customer Mood */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Mood</h3>
              
              {sentiment ? (
                <div className="space-y-4">
                  <div className={cn(
                    'p-3 rounded-lg text-center',
                    getSentimentColor(sentiment.overall)
                  )}>
                    <div className="text-2xl font-bold capitalize">
                      {sentiment.overall}
                    </div>
                    <div className="text-sm">
                      Score: {Math.round(sentiment.score * 100)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Emotions</h4>
                    {Object.entries(sentiment.emotions).map(([emotion, value]) => (
                      <div key={emotion} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{emotion}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${value * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {Math.round(value * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <div className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4">Analyzing sentiment...</p>
                </div>
              )}
            </div>

            {/* Audio Waveform */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audio Activity</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Customer</h4>
                  <Waveform isTalking={isCustomerTalking} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">AI Assistant</h4>
                  <Waveform isTalking={isAiTalking} />
                </div>
              </div>
            </div>

            {/* Call Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Call Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mode</span>
                  <span className={cn(
                    'text-sm font-medium',
                    isHandedOff ? 'text-green-600' : 'text-blue-600'
                  )}>
                    {isHandedOff ? 'Human Agent' : 'AI Assistant'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Connection</span>
                  <span className="text-sm font-medium text-green-600">
                    Connected
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recording</span>
                  <span className="text-sm font-medium text-green-600">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Human Handoff Notice */}
            {isHandedOff && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <UserIcon className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Human Agent Active
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Call has been handed off to a human agent. You can now take over the conversation.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
