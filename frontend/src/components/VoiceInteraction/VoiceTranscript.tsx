'use client';

import React, { useEffect, useRef } from 'react';
import { Badge, Tooltip } from 'antd';
import {
  UserIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

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

interface VoiceTranscriptProps {
  transcript: TranscriptEntry[];
  interimTranscript?: string;
  isListening: boolean;
  isProcessing: boolean;
  className?: string;
  maxHeight?: string;
  showConfidence?: boolean;
  showSentiment?: boolean;
}

export default function VoiceTranscript({
  transcript,
  interimTranscript,
  isListening,
  isProcessing,
  className,
  maxHeight = '400px',
  showConfidence = true,
  showSentiment = true
}: VoiceTranscriptProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return <MicrophoneIcon className="h-4 w-4" />;
      case 'agent':
        return <UserIcon className="h-4 w-4" />;
      default:
        return <SpeakerWaveIcon className="h-4 w-4" />;
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return 'bg-blue-100 text-blue-600';
      case 'agent':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-purple-100 text-purple-600';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Live Transcript</h3>
          <div className="flex items-center space-x-2">
            {isListening && (
              <Badge status="processing" text="Listening" />
            )}
            {isProcessing && (
              <Badge status="processing" text="Processing" />
            )}
          </div>
        </div>
      </div>

      <div 
        ref={transcriptRef}
        className="p-4 overflow-y-auto space-y-4"
        style={{ maxHeight }}
      >
        {transcript.length === 0 && !interimTranscript ? (
          <div className="text-center text-gray-500 py-8">
            <MicrophoneIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p>Start speaking to see your conversation transcript here...</p>
          </div>
        ) : (
          <>
            {/* Transcript Entries */}
            {transcript.map((entry) => (
              <div key={entry.id} className="flex space-x-3">
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  getSpeakerColor(entry.speaker)
                )}>
                  {getSpeakerIcon(entry.speaker)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {entry.speaker === 'ai' ? 'VoxAssist' : entry.speaker}
                    </span>
                    
                    <span className="text-xs text-gray-500 flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    
                    {showConfidence && entry.confidence && (
                      <Tooltip title={`Confidence: ${Math.round(entry.confidence * 100)}%`}>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          getConfidenceColor(entry.confidence)
                        )}>
                          {Math.round(entry.confidence * 100)}%
                        </span>
                      </Tooltip>
                    )}
                    
                    {showSentiment && entry.sentiment && (
                      <Tooltip title={`Sentiment: ${entry.sentiment} (${Math.round((entry.sentimentScore || 0) * 100)}%)`}>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded capitalize",
                          getSentimentColor(entry.sentiment)
                        )}>
                          {entry.sentiment}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  
                  <p className={cn(
                    "text-sm text-gray-700",
                    entry.isInterim && "italic text-gray-500"
                  )}>
                    {entry.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Interim Transcript */}
            {interimTranscript && (
              <div className="flex space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                  <MicrophoneIcon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      Customer
                    </span>
                    <Badge size="small" status="processing" text="Speaking..." />
                  </div>
                  
                  <p className="text-sm text-gray-500 italic">
                    {interimTranscript}
                  </p>
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                  <SpeakerWaveIcon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      VoxAssist
                    </span>
                    <Badge size="small" status="processing" text="Thinking..." />
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
