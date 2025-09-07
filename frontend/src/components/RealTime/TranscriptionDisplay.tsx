'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { TranscriptEntry, RealTimeEvent } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  UserIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface TranscriptionDisplayProps {
  callId: string;
  isLive?: boolean;
  initialTranscript?: TranscriptEntry[];
}

export default function TranscriptionDisplay({ 
  callId, 
  isLive = false, 
  initialTranscript = [] 
}: TranscriptionDisplayProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(initialTranscript);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const { isConnected: socketConnected, on, off, joinRoom, leaveRoom } = useSocket({
    autoConnect: isLive,
  });

  useEffect(() => {
    if (isLive && socketConnected) {
      joinRoom(`call-${callId}`);
      setIsConnected(true);

      // Listen for real-time transcript updates
      const handleTranscriptUpdate = (data: unknown) => {
        const event = data as RealTimeEvent;
        if (event.type === 'transcript_update' && event.callId === callId) {
          const newEntry: TranscriptEntry = event.data as TranscriptEntry;
          setTranscript(prev => [...prev, newEntry]);
          setCurrentSpeaker(newEntry.speaker);
        }
      };

      on('transcript-update', handleTranscriptUpdate);

      return () => {
        off('transcript-update', handleTranscriptUpdate);
        leaveRoom(`call-${callId}`);
        setIsConnected(false);
      };
    }
  }, [isLive, socketConnected, callId, on, off, joinRoom, leaveRoom]);

  useEffect(() => {
    // Auto-scroll to bottom when new transcript entries are added
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return UserIcon;
      case 'agent':
        return SpeakerWaveIcon;
      case 'ai':
        return ComputerDesktopIcon;
      default:
        return MicrophoneIcon;
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return 'text-blue-600 bg-blue-50';
      case 'agent':
        return 'text-green-600 bg-green-50';
      case 'ai':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return 'Customer';
      case 'agent':
        return 'Agent';
      case 'ai':
        return 'AI Assistant';
      default:
        return speaker;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isLive ? 'Live Transcription' : 'Call Transcript'}
          </h3>
          {isLive && (
            <div className="flex items-center">
              <div className={cn(
                'h-2 w-2 rounded-full mr-2',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              )} />
              <span className={cn(
                'text-sm font-medium',
                isConnected ? 'text-green-600' : 'text-gray-500'
              )}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
          {transcript.length === 0 ? (
            <div className="text-center py-8">
              <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {isLive ? 'Waiting for conversation...' : 'No transcript available'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isLive 
                  ? 'Transcript will appear here as the conversation progresses.'
                  : 'This call does not have a transcript yet.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transcript.map((entry, index) => {
                const SpeakerIcon = getSpeakerIcon(entry.speaker);
                const isCurrentSpeaker = isLive && currentSpeaker === entry.speaker;
                
                return (
                  <div
                    key={entry.id || index}
                    className={cn(
                      'flex items-start space-x-3 p-3 rounded-lg transition-colors',
                      isCurrentSpeaker ? 'bg-white shadow-sm ring-1 ring-indigo-200' : 'bg-transparent'
                    )}
                  >
                    <div className={cn(
                      'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                      getSpeakerColor(entry.speaker)
                    )}>
                      <SpeakerIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getSpeakerLabel(entry.speaker)}
                        </p>
                        <div className="flex items-center space-x-2">
                          {entry.confidence && (
                            <span className={cn(
                              'text-xs px-2 py-1 rounded-full',
                              entry.confidence > 0.8 
                                ? 'bg-green-100 text-green-800'
                                : entry.confidence > 0.6
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            )}>
                              {Math.round(entry.confidence * 100)}% confidence
                            </span>
                          )}
                          <time className="text-xs text-gray-500">
                            {formatDate(entry.timestamp)}
                          </time>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {entry.text}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {isLive && transcript.length > 0 && (
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <span>{transcript.length} messages</span>
            <button
              onClick={() => setTranscript([])}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Clear transcript
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
