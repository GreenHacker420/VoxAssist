import { useEffect, useRef, useState } from 'react';
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
}

export function useDemoCallWebSocket(): UseDemoCallWebSocketReturn {
  const { user, isDemoMode } = useAuth();
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
    if (!isDemoMode) {
      setError('Demo calls only available in demo mode');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      disconnectFromCall();
    }

    currentCallIdRef.current = callId;
    setCallStatus('connecting');
    setError(null);
    
    try {
      // Connect to WebSocket server
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.host}/ws`
        : 'ws://localhost:3001/ws';
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Demo call WebSocket connected');
        setIsConnected(true);
        setCallStatus('active');
        reconnectAttempts.current = 0;

        // Join the demo call room
        if (wsRef.current && currentCallIdRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'join_demo_call',
            callId: currentCallIdRef.current,
            token: isDemoMode ? 'demo-token' : 'real-token', // Demo users get demo token
            isDemoMode: isDemoMode
          }));
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
        
        // Attempt to reconnect if it wasn't a manual disconnect
        if (currentCallIdRef.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connectToCall(currentCallIdRef.current!);
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Connection lost. Please refresh the page to reconnect.');
          setCallStatus('ended');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Demo call WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Error connecting to demo call WebSocket:', error);
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

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'joined_demo_call':
        console.log('Successfully joined demo call:', data.callId);
        break;

      case 'demo_transcript_update':
        if (data.transcript) {
          setTranscript(prev => [...prev, data.transcript]);
        }
        if (data.sentiment) {
          setCurrentSentiment(data.sentiment);
        }
        break;

      case 'demo_sentiment_update':
        if (data.sentiment) {
          setCurrentSentiment(data.sentiment);
        }
        break;

      case 'demo_call_ended':
        setCallStatus('ended');
        disconnectFromCall();
        break;

      case 'error':
        console.error('Demo call WebSocket error:', data.message);
        setError(data.message);
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

  // Handle auth changes
  useEffect(() => {
    if (!isDemoMode && isConnected) {
      disconnectFromCall();
    }
  }, [isDemoMode, isConnected]);

  return {
    isConnected,
    transcript,
    currentSentiment,
    callStatus,
    error,
    connectToCall,
    disconnectFromCall,
    addTranscriptEntry,
    updateSentiment
  };
}
