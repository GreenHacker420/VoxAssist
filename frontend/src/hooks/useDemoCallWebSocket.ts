import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'ai' | 'agent';
  text: string;
  timestamp: string;
  confidence?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
  };
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

interface DemoCallWebSocketData {
  isConnected: boolean;
  transcript: TranscriptEntry[];
  currentSentiment: SentimentData;
  callStatus: 'idle' | 'connecting' | 'active' | 'ended';
  error: string | null;
}

interface UseDemoCallWebSocketReturn extends DemoCallWebSocketData {
  connectToCall: (callId: string) => void;
  disconnectFromCall: () => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  updateSentiment: (sentiment: SentimentData) => void;
  sendVoiceInput: (audioData: string, format?: string, audioMetrics?: { volume: number; clarity: number; duration: number; sampleRate: number; bitRate: number }) => void;
}

interface VoiceAnalysisData {
  sentiment: {
    overall: string;
    score: number;
    confidence: number;
  };
  emotion: {
    primary: string;
    intensity: string;
    confidence: number;
  };
  intent: {
    category: string;
    specific: string;
    urgency: string;
    confidence: number;
  };
  keywords: string[];
  summary: string;
  recommendedResponse: string;
  audioMetrics: {
    volume: number;
    clarity: number;
    duration: number;
    sampleRate: number;
    bitRate: number;
    overallQuality: string;
  };
}

interface UseDemoCallWebSocketOptions {
  onAudioResponse?: (audioData: string, transcriptId?: string, contentType?: string) => void;
  onAudioStream?: (audioData: string, transcriptId?: string, metadata?: { speaker?: string; messageId?: string }) => void;
  onVoiceTranscribed?: (transcript: string) => void;
  onVoiceAnalysis?: (analysis: VoiceAnalysisData) => void;
}

export function useDemoCallWebSocket(options: UseDemoCallWebSocketOptions = {}): UseDemoCallWebSocketReturn {
  const { onAudioResponse, onAudioStream, onVoiceTranscribed, onVoiceAnalysis } = options;
  // Remove isDemoMode dependency as it's being removed
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentData>({
    overall: 'neutral',
    score: 0.5,
    emotions: { joy: 0.2, anger: 0.2, fear: 0.2, sadness: 0.2, surprise: 0.2 }
  });
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectToCall = (callId: string) => {
    console.log('Connecting to demo call:', callId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      disconnectFromCall();
    }

    currentCallIdRef.current = callId;
    setCallStatus('connecting');
    setError(null);

    try {
      // Connect to WebSocket server
      const wsUrl = process.env.NODE_ENV === 'production'
        ? 'wss://voxassist.onrender.com/ws'
        : 'ws://localhost:3001/ws';

      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl!);

      wsRef.current.onopen = () => {
        console.log('Demo call WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Join the demo call room
        if (wsRef.current && currentCallIdRef.current) {
          const joinMessage = {
            type: 'join_demo_call',
            callId: currentCallIdRef.current,
            token: 'demo-token' // Demo token for demo calls
          };
          console.log('Sending join message:', joinMessage);
          wsRef.current.send(JSON.stringify(joinMessage));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Demo call WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Only attempt to reconnect if the WebSocket server is available
        // For demo mode, we'll be more graceful about connection failures
        if (currentCallIdRef.current && reconnectAttempts.current < maxReconnectAttempts && event.code !== 1006) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connectToCall(currentCallIdRef.current!);
          }, delay);
        } else {
          // Gracefully handle connection failure in demo mode
          console.log('WebSocket server not available, demo will continue in offline mode');
          setCallStatus('ended');
        }
      };

      wsRef.current.onerror = (error) => {
        // Enhanced WebSocket error logging
        const errorDetails = {
          type: error.type || 'unknown',
          target: error.target && error.target instanceof WebSocket ? {
            readyState: error.target.readyState,
            url: error.target.url,
            protocol: error.target.protocol
          } : null,
          timestamp: new Date().toISOString(),
          callId: callId,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
          connectionState: wsRef.current?.readyState,
          wsUrl: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/demo-calls`
        };

        console.error('Demo call WebSocket error details:', errorDetails);
        console.error('Original WebSocket error:', error);
        console.log('WebSocket connection failed, demo will work in offline mode');

        // Additional debugging information
        if (error.target && error.target instanceof WebSocket) {
          console.log('WebSocket readyState:', error.target.readyState);
          console.log('WebSocket URL:', error.target.url);
        }
      };

    } catch (error) {
      // Enhanced connection error logging
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown connection error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'ConnectionError',
        timestamp: new Date().toISOString(),
        callId: callId,
        wsUrl: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/demo-calls`,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
        networkState: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'
      };

      console.error('Error connecting to demo call WebSocket:', errorDetails);
      console.error('Original connection error:', error);
      setError('Failed to connect to demo call');
    }
  };

  const disconnectFromCall = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Send leave message before closing
      if (currentCallIdRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'leave_call',
          callId: currentCallIdRef.current
        }));
      }
      
      wsRef.current.close();
      wsRef.current = null;
    }

    currentCallIdRef.current = null;
    setIsConnected(false);
    setCallStatus('idle');
    reconnectAttempts.current = 0;
  };

  const handleWebSocketMessage = (data: Record<string, unknown>) => {
    console.log('Received WebSocket message:', data);

    switch (data.type) {
      case 'joined_demo_call':
        console.log('Successfully joined demo call:', data.callId);
        setCallStatus('active');
        setError(null);
        break;

      case 'transcript_entry':
        console.log('Received transcript entry:', data.entry);
        if (data.entry && typeof data.entry === 'object') {
          const transcript = data.entry as TranscriptEntry;
          setTranscript(prev => {
            // Avoid duplicates
            const exists = prev.some(entry => entry.id === transcript.id);
            if (!exists) {
              return [...prev, transcript];
            }
            return prev;
          });
        }
        break;

      case 'demo_transcript_update':
        console.log('Received transcript update:', data.transcript);
        if (data.transcript && typeof data.transcript === 'object') {
          const transcript = data.transcript as TranscriptEntry;
          setTranscript(prev => {
            // Avoid duplicates
            const exists = prev.some(entry => entry.id === transcript.id);
            if (!exists) {
              return [...prev, transcript];
            }
            return prev;
          });
        }
        if (data.sentiment && typeof data.sentiment === 'object') {
          setCurrentSentiment(data.sentiment as SentimentData);
        }
        break;

      case 'demo_sentiment_update':
        console.log('Received sentiment update:', data.sentiment);
        if (data.sentiment && typeof data.sentiment === 'object') {
          setCurrentSentiment(data.sentiment as SentimentData);
        }
        break;

      case 'voice_interaction_status':
        console.log('Voice interaction status update:', data.status);
        // Voice interaction status is handled by the VoiceInteractionManager
        break;

      case 'audio_response':
        console.log('Audio response received:', {
          hasText: !!data.text,
          hasAudio: !!data.audioData,
          audioDataLength: data.audioData && typeof data.audioData === 'string' ? data.audioData.length : 0,
          contentType: data.contentType,
          transcriptId: data.transcriptId
        });
        // Handle AI audio response from demo call service
        if (data.audioData && typeof data.audioData === 'string') {
          console.log('Received audio response with base64 data, length:', data.audioData.length);
          console.log('Content type:', data.contentType);

          if (onAudioResponse) {
            // Pass raw base64 data and content type to the handler
            // The handler will be responsible for creating the audio blob
            console.log('Calling onAudioResponse with base64 data');
            onAudioResponse(data.audioData, (data.transcriptId as string) || '', (data.contentType as string) || 'audio/mpeg');
          } else {
            console.warn('onAudioResponse callback not available');
          }
        } else if (data.text && onAudioResponse) {
          // Text-only response, let the handler decide what to do
          console.log('Text-only response received, no audio data');
          onAudioResponse('', (data.transcriptId as string) || '', 'text/plain');
        }
        break;

      case 'audio_response_ready':
        console.log('Audio response ready:', data.audioUrl);
        // Trigger audio playback for AI responses (legacy file-based)
        if (data.audioUrl && typeof data.audioUrl === 'string' && onAudioResponse) {
          onAudioResponse(data.audioUrl, data.transcriptId as string);
        }
        break;

      case 'audio_stream_data':
        console.log('Audio stream data received:', data.metadata);
        // Trigger audio playback for AI responses (WebSocket streaming)
        if (data.audioData && typeof data.audioData === 'string' && onAudioStream) {
          onAudioStream(data.audioData, data.transcriptId as string, data.metadata as { speaker?: string; messageId?: string });
        }
        break;

      // Removed audio_stream_ready handler to fix duplicate audio playback
      // Now using only audio_response for consistent single audio playback

      case 'voice_transcribed':
        console.log('Voice transcribed:', data.transcript);
        // Handle voice transcription result
        if (data.transcript && typeof data.transcript === 'string' && onVoiceTranscribed) {
          onVoiceTranscribed(data.transcript);
        }
        break;

      case 'voice_analysis':
        console.log('Voice analysis received:', data);
        // Handle comprehensive voice analysis results
        if (data && typeof data === 'object' && onVoiceAnalysis) {
          onVoiceAnalysis(data as unknown as VoiceAnalysisData);
        }
        break;

      case 'voice_input_processed':
        console.log('Voice input processed:', data);
        // Handle voice input processing confirmation
        if (data.success) {
          console.log('Voice input processed successfully:', data.transcriptId);
        } else {
          console.warn('Voice input processing failed:', data.message);
        }
        break;

      case 'demo_call_ended':
        console.log('Demo call ended');
        setCallStatus('ended');
        disconnectFromCall();
        break;

      case 'error':
        console.error('Demo call WebSocket error:', data.message);
        setError(typeof data.message === 'string' ? data.message : 'Unknown error');
        setCallStatus('idle');
        break;

      default:
        console.log('Unknown demo call WebSocket message:', data);
    }
  };

  const addTranscriptEntry = (entry: TranscriptEntry) => {
    setTranscript(prev => [...prev, entry]);
  };

  const updateSentiment = (sentiment: SentimentData) => {
    setCurrentSentiment(sentiment);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromCall();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectFromCall();
      }
    };
  }, []);

  const sendVoiceInput = useCallback((audioData: string, format: string = 'webm', audioMetrics?: { volume: number; clarity: number; duration: number; sampleRate: number; bitRate: number }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentCallIdRef.current) {
      const message = {
        type: 'voice_input',
        callId: currentCallIdRef.current,
        audioData,
        format,
        audioMetrics
      };

      wsRef.current.send(JSON.stringify(message));
      console.log('Sent voice input:', { format, size: audioData.length, audioMetrics });
    } else {
      console.warn('Cannot send voice input: WebSocket not connected or no active call');
    }
  }, []);

  return {
    isConnected,
    transcript,
    currentSentiment,
    callStatus,
    error,
    connectToCall,
    disconnectFromCall,
    addTranscriptEntry,
    updateSentiment,
    sendVoiceInput
  };
}
