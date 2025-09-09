'use client';

import { useState, useEffect } from 'react';
import { 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon,
  EyeIcon,
  UserIcon,
  ChartBarIcon,
  
} from '@heroicons/react/24/outline';
import { Call } from '@/types';
import toast from 'react-hot-toast';

interface CallControlsPopupProps {
  call: Call;
  isVisible: boolean;
  onClose: () => void;
  onEndCall: () => void;
  onHandoffToHuman: () => void;
}

export default function CallControlsPopup({ 
  call, 
  isVisible, 
  onClose, 
  onEndCall, 
  onHandoffToHuman 
}: CallControlsPopupProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (call?.status === 'active') {
      const startTime = new Date(call.startTime).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        const duration = Math.floor((now - startTime) / 1000);
        setCallDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [call]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Microphone unmuted' : 'Microphone muted');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value));
  };

  const handleHandoff = async () => {
    try {
      setIsHandingOff(true);
      await onHandoffToHuman();
      toast.success('Call handed off to human agent');
    } catch {
      toast.error('Failed to handoff call');
    } finally {
      setIsHandingOff(false);
    }
  };

  const handleMonitorLive = () => {
    window.open(`/calls/live/${call.id}`, '_blank');
  };

  if (!isVisible || call?.status !== 'active') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-semibold text-gray-900">Active Call</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Call Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Phone Number:</span>
            <span className="text-sm font-medium text-gray-900">{call.customerPhone || 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="text-sm font-medium text-gray-900">{formatDuration(callDuration)}</span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Audio Controls</h4>
          
          {/* Mute Button */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Microphone</span>
            <button
              onClick={handleMuteToggle}
              className={`p-2 rounded-full ${
                isMuted 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              <MicrophoneIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <SpeakerWaveIcon className="w-4 h-4 text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-600 w-8">{volume}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Monitor Live */}
          <button
            onClick={handleMonitorLive}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
            <span className="text-sm">Monitor Live</span>
          </button>

          {/* Handoff to Human */}
          <button
            onClick={handleHandoff}
            disabled={isHandingOff || call.escalated}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            <span className="text-sm">
              {isHandingOff ? 'Handing off...' : call.escalated ? 'Already escalated' : 'Handoff to Human'}
            </span>
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <PhoneXMarkIcon className="w-4 h-4" />
            <span className="text-sm">End Call</span>
          </button>
        </div>

        {/* Call Stats */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Call ID: {call.id}</span>
            <div className="flex items-center space-x-1">
              <ChartBarIcon className="w-3 h-3" />
              <span>Live Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
