'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { useVoiceInteraction } from '@/hooks/useVoiceInteraction';
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
  onSentimentUpdate?: (sentiment: any) => void;
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
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  
  const audioQueueRef = useRef<any>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio queue
  useEffect(() => {
    audioQueueRef.current = voiceInteractionService.createAudioQueue();
    return () => {
      if (audioQueueRef.current) {
        audioQueueRef.current.clear();
      }
    };
  }, []);

  // Voice interaction callbacks
  const handleTranscript = useCallback(async (transcriptText: string, isInterim: boolean, confidence: number) => {
    if (!callId || !isVoiceEnabled) return;

    try {
      // Process speech with backend
      const response = await voiceInteractionService.processSpeech(callId, transcriptText, isInterim);
      
      if (response.success && response.data) {
        // Handle interim results
        if (isInterim) {
          // Don't add interim results to transcript, just show them
          return;
        }

        // Add customer transcript entry
        const customerEntry: TranscriptEntry = {
          id: `customer-${Date.now()}`,
          speaker: 'customer',
          text: transcriptText,
          timestamp: new Date().toISOString(),
          confidence,
          isInterim: false
        };

        setTranscript(prev => [...prev, customerEntry]);

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

        // Update transcript callback
        onTranscriptUpdate?.(transcript);
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      message.error('Failed to process speech');
    }
  }, [callId, isVoiceEnabled, transcript, onTranscriptUpdate, onSentimentUpdate]);

  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice interaction error:', error);
    message.error(error);
  }, []);

  const handleVoiceStart = useCallback(() => {
    onStatusChange?.('listening');
  }, [onStatusChange]);

  const handleVoiceEnd = useCallback(() => {
    onStatusChange?.('idle');
  }, [onStatusChange]);

  // Initialize voice interaction
  const {
    isListening,
    isProcessing,
    isSpeaking,
    isSupported,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    setProcessing,
    setSpeaking,
    clearError
  } = useVoiceInteraction(
    {
      continuous: true,
      interimResults: true,
      language: 'en-US'
    },
    {
      onTranscript: handleTranscript,
      onError: handleVoiceError,
      onStart: handleVoiceStart,
      onEnd: handleVoiceEnd
    }
  );

  // Enable voice interaction when component mounts
  useEffect(() => {
    const enableVoice = async () => {
      try {
        const response = await voiceInteractionService.enableVoiceInteraction(callId);
        if (response.success) {
          setIsVoiceEnabled(true);
          message.success('Voice interaction enabled');
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
      // Cleanup: disable voice interaction
      if (callId && isVoiceEnabled) {
        voiceInteractionService.disableVoiceInteraction(callId).catch(console.error);
      }
    };
  }, [callId, disabled]);

  // Handle audio playback events
  const handleAudioPlay = useCallback(() => {
    setSpeaking(true);
    onStatusChange?.('speaking');
  }, [setSpeaking, onStatusChange]);

  const handleAudioPause = useCallback(() => {
    setSpeaking(false);
    onStatusChange?.('idle');
  }, [setSpeaking, onStatusChange]);

  const handleAudioEnded = useCallback(() => {
    setSpeaking(false);
    setCurrentAudioUrl(null);
    onStatusChange?.('idle');
  }, [setSpeaking, onStatusChange]);

  const handleAudioError = useCallback((error: string) => {
    setSpeaking(false);
    setCurrentAudioUrl(null);
    onStatusChange?.('idle');
    message.error(`Audio playback error: ${error}`);
  }, [setSpeaking, onStatusChange]);

  // Update processing state based on voice interaction
  useEffect(() => {
    if (isProcessing) {
      onStatusChange?.('processing');
      setProcessing(true);
    } else {
      setProcessing(false);
    }
  }, [isProcessing, onStatusChange, setProcessing]);

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
      await toggleListening();
    } catch (error) {
      console.error('Error toggling voice interaction:', error);
      message.error('Failed to toggle voice interaction');
    }
  }, [isVoiceEnabled, isSupported, toggleListening]);

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
          onClearError={clearError}
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
