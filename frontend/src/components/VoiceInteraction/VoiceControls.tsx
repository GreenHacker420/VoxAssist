'use client';

import React from 'react';
import { Button, Tooltip, Space, Badge } from 'antd';
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  StopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface VoiceControlsProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
  onToggleListening: () => void;
  onClearError: () => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceControls({
  isListening,
  isProcessing,
  isSpeaking,
  isSupported,
  error,
  onToggleListening,
  onClearError,
  disabled = false,
  className
}: VoiceControlsProps) {
  const getMicrophoneStatus = () => {
    if (error) return 'error';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'idle';
  };

  const getMicrophoneIcon = () => {
    const status = getMicrophoneStatus();
    
    switch (status) {
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'listening':
        return <MicrophoneIcon className="h-5 w-5" />;
      case 'processing':
        return <MicrophoneIcon className="h-5 w-5 animate-pulse" />;
      default:
        return <MicrophoneIcon className="h-5 w-5" />;
    }
  };

  const getMicrophoneButtonClass = () => {
    const status = getMicrophoneStatus();
    const baseClass = "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200";
    
    switch (status) {
      case 'error':
        return cn(baseClass, "bg-red-100 text-red-600 border-2 border-red-300 hover:bg-red-200");
      case 'listening':
        return cn(baseClass, "bg-green-100 text-green-600 border-2 border-green-300 animate-pulse");
      case 'processing':
        return cn(baseClass, "bg-blue-100 text-blue-600 border-2 border-blue-300");
      default:
        return cn(baseClass, "bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200");
    }
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isProcessing) return 'Processing...';
    if (isListening) return 'Listening...';
    if (isSpeaking) return 'AI Speaking...';
    return 'Ready';
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (isProcessing) return 'text-blue-600';
    if (isListening) return 'text-green-600';
    if (isSpeaking) return 'text-purple-600';
    return 'text-gray-600';
  };

  if (!isSupported) {
    return (
      <div className={cn("bg-yellow-50 border border-yellow-200 rounded-lg p-4", className)}>
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Speech Recognition Not Supported
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Your browser doesn&apos;t support speech recognition. Please use Chrome, Edge, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Microphone Button */}
          <Tooltip title={isListening ? 'Stop Listening' : 'Start Listening'}>
            <button
              onClick={onToggleListening}
              disabled={disabled}
              className={getMicrophoneButtonClass()}
            >
              {getMicrophoneIcon()}
            </button>
          </Tooltip>

          {/* Status Display */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className={cn("text-sm font-medium", getStatusColor())}>
                {getStatusText()}
              </span>
              {isSpeaking && (
                <Badge 
                  status="processing" 
                  text={
                    <span className="text-xs text-purple-600">
                      <SpeakerWaveIcon className="h-3 w-3 inline mr-1" />
                      Playing Response
                    </span>
                  } 
                />
              )}
            </div>
            
            {error && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-red-600">{error}</span>
                <Button 
                  size="small" 
                  type="link" 
                  onClick={onClearError}
                  className="p-0 h-auto text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Voice Activity Indicator */}
        <div className="flex items-center space-x-2">
          {isListening && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
          
          {isSpeaking && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {isListening 
            ? "Speak naturally. Your voice will be processed in real-time."
            : "Click the microphone to start voice interaction."
          }
        </p>
      </div>
    </div>
  );
}
