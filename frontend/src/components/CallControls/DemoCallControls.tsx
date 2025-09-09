'use client';

import { useState } from 'react';
import { 
  MicrophoneIcon, 
  PhoneXMarkIcon, 
  PauseIcon, 
  PlayIcon,
  ArrowPathIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DemoCallControlsProps {
  callStatus: string;
  onCallEnd?: () => void;
}

export default function DemoCallControls({ callStatus, onCallEnd }: DemoCallControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Microphone unmuted (demo)' : 'Microphone muted (demo)');
  };

  const handleHold = () => {
    setIsOnHold(!isOnHold);
    toast.success(isOnHold ? 'Call resumed (demo)' : 'Call on hold (demo)');
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
    toast.success(isRecording ? 'Recording stopped (demo)' : 'Recording started (demo)');
  };

  const handleTransfer = () => {
    toast.success('Call transfer initiated (demo)');
  };

  const handleHangup = () => {
    toast.success('Call ended (demo)');
    onCallEnd?.();
  };

  if (callStatus !== 'active') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Call Controls</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Live Demo
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Mute/Unmute */}
        <button
          onClick={handleMute}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
            isMuted 
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MicrophoneIcon className={`h-6 w-6 mb-2 ${isMuted ? 'text-red-500' : 'text-gray-500'}`} />
          <span className="text-sm font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Hold/Resume */}
        <button
          onClick={handleHold}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
            isOnHold 
              ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' 
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isOnHold ? (
            <PlayIcon className="h-6 w-6 mb-2 text-yellow-500" />
          ) : (
            <PauseIcon className="h-6 w-6 mb-2 text-gray-500" />
          )}
          <span className="text-sm font-medium">{isOnHold ? 'Resume' : 'Hold'}</span>
        </button>

        {/* Record */}
        <button
          onClick={handleRecord}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
            isRecording 
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <StopIcon className={`h-6 w-6 mb-2 ${isRecording ? 'text-red-500' : 'text-gray-500'}`} />
          <span className="text-sm font-medium">{isRecording ? 'Stop Rec' : 'Record'}</span>
        </button>

        {/* Transfer */}
        <button
          onClick={handleTransfer}
          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200"
        >
          <ArrowPathIcon className="h-6 w-6 mb-2 text-gray-500" />
          <span className="text-sm font-medium">Transfer</span>
        </button>

        {/* Hang Up */}
        <button
          onClick={handleHangup}
          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-all duration-200"
        >
          <PhoneXMarkIcon className="h-6 w-6 mb-2 text-red-500" />
          <span className="text-sm font-medium">End Call</span>
        </button>
      </div>

      {/* Call Status Indicators */}
      <div className="mt-6 flex flex-wrap gap-2">
        {isMuted && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Muted
          </span>
        )}
        {isOnHold && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            On Hold
          </span>
        )}
        {isRecording && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Recording
          </span>
        )}
      </div>

      {/* Demo Information */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Demo Mode:</strong> These controls simulate real call management features. 
          In production, they would control actual call audio and state.
        </p>
      </div>
    </div>
  );
}
