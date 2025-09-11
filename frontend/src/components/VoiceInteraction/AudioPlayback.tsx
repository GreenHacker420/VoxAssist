'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Progress, Tooltip } from 'antd';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { voiceErrorHandler } from '@/services/voiceErrorHandler';

interface AudioPlaybackProps {
  audioUrl?: string;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
  volume?: number;
}

export default function AudioPlayback({
  audioUrl,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded,
  onError,
  className,
  showControls = true,
  volume = 1.0
}: AudioPlaybackProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      setIsLoading(true);
      setError(null);
      audioRef.current.src = audioUrl;
      audioRef.current.volume = volume;
      
      if (autoPlay) {
        playAudio();
      }
    }
  }, [audioUrl, volume, autoPlay]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleError = (e: Event) => {
      const errorMessage = 'Failed to load or play audio';
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Use voice error handler for comprehensive error handling
      const context = voiceErrorHandler.createErrorContext('AudioPlayback', 'audioError', { 
        audioUrl, 
        error: e 
      });
      voiceErrorHandler.handleError('TTS_SERVICE_FAILED', context, {
        onError: (voiceError) => {
          onError?.(voiceError.message);
        }
      });
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    return () => {
      // Remove event listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [onPlay, onPause, onEnded, onError]);

  const playAudio = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        const errorMessage = 'Failed to play audio';
        setError(errorMessage);
        
        // Use voice error handler for comprehensive error handling
        const context = voiceErrorHandler.createErrorContext('AudioPlayback', 'playAudio', { 
          audioUrl, 
          error 
        });
        voiceErrorHandler.handleError('TTS_SERVICE_FAILED', context, {
          onError: (voiceError) => {
            onError?.(voiceError.message);
          }
        });
      }
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = (value / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4", className)}>
      <audio ref={audioRef} preload="metadata" />
      
      <div className="flex items-center space-x-4">
        {/* Play/Pause Button */}
        <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
          <Button
            type="primary"
            shape="circle"
            icon={
              isLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )
            }
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="flex-shrink-0"
          />
        </Tooltip>

        {/* Progress Bar */}
        {showControls && (
          <div className="flex-1">
            <div
              className="cursor-pointer"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const percent = ((e.clientX - rect.left) / rect.width) * 100;
                handleSeek(percent);
              }}
            >
              <Progress
                percent={getProgressPercent()}
                showInfo={false}
                strokeColor="#1890ff"
                trailColor="#f0f0f0"
                className="mb-1"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Volume Control */}
        {showControls && (
          <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
            <Button
              type="text"
              icon={
                isMuted ? (
                  <SpeakerXMarkIcon className="h-4 w-4" />
                ) : (
                  <SpeakerWaveIcon className="h-4 w-4" />
                )
              }
              onClick={toggleMute}
              className="flex-shrink-0"
            />
          </Tooltip>
        )}

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {isLoading && (
            <span className="text-xs text-blue-600">Loading...</span>
          )}
          {isPlaying && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Playing</span>
            </div>
          )}
          {error && (
            <span className="text-xs text-red-600">Error</span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
