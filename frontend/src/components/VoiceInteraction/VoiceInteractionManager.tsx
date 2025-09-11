'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { App } from 'antd';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useDemoCallWebSocket } from '@/hooks/useDemoCallWebSocket';
import { voiceErrorHandler } from '@/services/voiceErrorHandler';
import * as voiceInteractionService from '@/services/voiceInteraction';
import VoiceControls from './VoiceControls';
import VoiceTranscript from './VoiceTranscript';
import AudioPlayback from './AudioPlayback';

interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'ai' | 'agent';
  text: string;
  timestamp: string;
  confidence?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  isInterim?: boolean;
}

interface VoiceInteractionManagerProps {
  callId: string;
  onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;
  onSentimentUpdate?: (sentiment: { overall: string; score: number; emotions: Record<string, number> }) => void;
  onStatusChange?: (status: 'idle' | 'listening' | 'processing' | 'speaking') => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInteractionManager({
  callId,
  onTranscriptUpdate,
  onSentimentUpdate,
  onStatusChange,
  disabled = false,
  className
}: VoiceInteractionManagerProps) {
  const { message } = App.useApp();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioQueueRef = useRef<{ add: (url: string) => void; clear: () => void } | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize audio queue
  useEffect(() => {
    audioQueueRef.current = voiceInteractionService.createAudioQueue();
    return () => {
      if (audioQueueRef.current) {
        audioQueueRef.current.clear();
      }
    };
  }, []);

  // Initialize demo call WebSocket
  const {
    isConnected: wsConnected,
    transcript: wsTranscript,
    currentSentiment,
    callStatus,
    error: wsError,
    connectToCall,
    disconnectFromCall,
    sendVoiceInput
  } = useDemoCallWebSocket({
    onAudioResponse: (audioUrl: string) => {
      if (audioUrl) {
        setCurrentAudioUrl(audioUrl);
        audioQueueRef.current?.add(audioUrl);
      }
    },
    onVoiceTranscribed: (transcriptText: string) => {
      console.log('Voice transcribed:', transcriptText);
    },
    onVoiceAnalysis: (analysis) => {
      console.log('Voice analysis:', analysis);
      if (analysis.sentiment) {
        onSentimentUpdate?.({
          overall: analysis.sentiment.overall,
          score: analysis.sentiment.score,
          emotions: {}
        });
      }
    }
  });

  // Voice input processing
  const handleSpeechResult = useCallback(async (result: { transcript: string; confidence: number; isFinal: boolean }) => {
    if (!callId || !isVoiceEnabled || !result.isFinal) return;

    try {
      setIsProcessing(true);
      onStatusChange?.('processing');

      // Add customer transcript entry
      const customerEntry: TranscriptEntry = {
        id: `customer-${Date.now()}`,
        speaker: 'customer',
        text: result.transcript,
        timestamp: new Date().toISOString(),
        confidence: result.confidence,
        isInterim: false
      };

      setTranscript(prev => [...prev, customerEntry]);

      // Send voice input to WebSocket if connected
      if (wsConnected && mediaRecorderRef.current) {
        // Convert current audio to base64 and send
        // This would be implemented with actual audio capture
        console.log('Sending voice input to WebSocket:', result.transcript);
      }

      // Process speech with backend as fallback
      const response = await voiceInteractionService.processSpeech(callId, result.transcript, false);
      
      if (response.success && response.data) {
        // If we have an AI response, add it to transcript
        if (response.data.aiResponse) {
          const aiEntry: TranscriptEntry = {
            id: response.data.transcriptId || `ai-${Date.now()}`,
            speaker: 'ai',
            text: response.data.aiResponse,
            timestamp: new Date().toISOString(),
            confidence: 0.95,
            isInterim: false
          };

          setTranscript(prev => [...prev, aiEntry]);

          // Play audio response if available
          if (response.data.audioUrl) {
            setCurrentAudioUrl(response.data.audioUrl);
            audioQueueRef.current?.add(response.data.audioUrl);
          }
        }

        // Update sentiment
        if (response.data.sentiment) {
          onSentimentUpdate?.(response.data.sentiment);
        }
      }

      // Update transcript callback
      onTranscriptUpdate?.(transcript);
    } catch (error) {
      console.error('Error processing transcript:', error);
      const context = voiceErrorHandler.createErrorContext('VoiceInteractionManager', 'processSpeech', { error });
      voiceErrorHandler.handleError('AI_SERVICE_UNAVAILABLE', context, {
        onError: (voiceError) => {
          message.error(voiceError.message);
        }
      });
    } finally {
      setIsProcessing(false);
      onStatusChange?.('idle');
    }
  }, [callId, isVoiceEnabled, wsConnected, transcript, onTranscriptUpdate, onSentimentUpdate, onStatusChange, message]);

  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice interaction error:', error);
    const context = voiceErrorHandler.createErrorContext('VoiceInteractionManager', 'voiceError', { error });
    voiceErrorHandler.handleError('SPEECH_RECOGNITION_FAILED', context, {
      onError: (voiceError) => {
        message.error(voiceError.message);
      }
    });
  }, [message]);

  const handleVoiceStart = useCallback(() => {
    onStatusChange?.('listening');
  }, [onStatusChange]);

  const handleVoiceEnd = useCallback(() => {
    onStatusChange?.('idle');
  }, [onStatusChange]);

  // Initialize enhanced speech-to-text
  const {
    isListening,
    transcript: currentTranscript,
    interimTranscript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript
  } = useSpeechToText({
    continuous: true,
    interimResults: true,
    language: 'en-US',
    onResult: handleSpeechResult,
    onError: handleVoiceError,
    onStart: handleVoiceStart,
    onEnd: handleVoiceEnd
  });

  // Enable voice interaction when component mounts
  useEffect(() => {
    const enableVoice = async () => {
      try {
        const response = await voiceInteractionService.enableVoiceInteraction(callId);
        if (response.success) {
          setIsVoiceEnabled(true);
          message.success('Voice interaction enabled');
          // Connect to demo call WebSocket
          connectToCall(callId);
        } else {
          message.error(response.error || 'Failed to enable voice interaction');
        }
      } catch (error) {
        console.error('Error enabling voice interaction:', error);
        message.error('Failed to enable voice interaction');
      }
    };

    if (callId && !disabled) {
      enableVoice();
    }

    return () => {
      // Cleanup: disable voice interaction and disconnect WebSocket
      if (callId && isVoiceEnabled) {
        voiceInteractionService.disableVoiceInteraction(callId).catch(console.error);
        disconnectFromCall();
      }
    };
  }, [callId, disabled]);

  // Handle audio playback events
  const handleAudioPlay = useCallback(() => {
    setIsSpeaking(true);
    onStatusChange?.('speaking');
  }, [onStatusChange]);

  const handleAudioPause = useCallback(() => {
    setIsSpeaking(false);
    onStatusChange?.('idle');
  }, [onStatusChange]);

  const handleAudioEnded = useCallback(() => {
    setIsSpeaking(false);
    setCurrentAudioUrl(null);
    onStatusChange?.('idle');
  }, [onStatusChange]);

  const handleAudioError = useCallback((error: string) => {
    setIsSpeaking(false);
    setCurrentAudioUrl(null);
    onStatusChange?.('idle');
    const context = voiceErrorHandler.createErrorContext('VoiceInteractionManager', 'audioPlayback', { error });
    voiceErrorHandler.handleError('TTS_SERVICE_FAILED', context, {
      onError: (voiceError) => {
        message.error(voiceError.message);
      }
    });
  }, [onStatusChange, message]);

  // Sync WebSocket transcript with local transcript
  useEffect(() => {
    if (wsTranscript.length > 0) {
      setTranscript(prev => {
        const newEntries = wsTranscript.filter(entry => 
          !prev.some(existing => existing.id === entry.id)
        );
        return [...prev, ...newEntries];
      });
      onTranscriptUpdate?.(transcript);
    }
  }, [wsTranscript, transcript, onTranscriptUpdate]);

  // Update sentiment from WebSocket
  useEffect(() => {
    if (currentSentiment) {
      onSentimentUpdate?.(currentSentiment);
    }
  }, [currentSentiment, onSentimentUpdate]);

  // Handle voice interaction toggle
  const handleToggleListening = useCallback(async () => {
    if (!isVoiceEnabled) {
      message.warning('Voice interaction is not enabled');
      return;
    }

    if (!isSupported) {
      message.error('Speech recognition is not supported in this browser');
      return;
    }

    try {
      toggleListening();
    } catch (error) {
      console.error('Error toggling voice interaction:', error);
      const context = voiceErrorHandler.createErrorContext('VoiceInteractionManager', 'toggleListening', { error });
      voiceErrorHandler.handleError('SPEECH_RECOGNITION_FAILED', context, {
        onError: (voiceError) => {
          message.error(voiceError.message);
        }
      });
    }
  }, [isVoiceEnabled, isSupported, toggleListening, message]);

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Voice Controls */}
        <VoiceControls
          isListening={isListening}
          isProcessing={isProcessing}
          isSpeaking={isSpeaking}
          isSupported={isSupported}
          error={error}
          onToggleListening={handleToggleListening}
          onClearError={() => { /* Clear error handled by voice error handler */ }}
          disabled={disabled || !isVoiceEnabled}
        />

        {/* Voice Transcript */}
        <VoiceTranscript
          transcript={transcript}
          interimTranscript={interimTranscript}
          isListening={isListening}
          isProcessing={isProcessing}
          showConfidence={true}
          showSentiment={true}
        />

        {/* Audio Playback */}
        {currentAudioUrl && (
          <AudioPlayback
            audioUrl={currentAudioUrl}
            autoPlay={true}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onEnded={handleAudioEnded}
            onError={handleAudioError}
            showControls={true}
          />
        )}
      </div>
    </div>
  );
}
