'use client';

import { useState, useRef, useCallback } from 'react';
import { Button, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';

export interface VoiceAnalysisData {
  volume: number;
  pitch: number;
  clarity: number;
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited';
  confidence: number;
}

interface VoiceInputButtonProps {
  onVoiceInput: (audioBlob: Blob, analysis: VoiceAnalysisData) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInputButton({ 
  onVoiceInput, 
  disabled = false,
  className = ''
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const analyzeAudio = useCallback((dataArray: Uint8Array): VoiceAnalysisData => {
    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = (dataArray[i] - 128) / 128;
      sum += amplitude * amplitude;
    }
    const volume = Math.sqrt(sum / dataArray.length);

    // Simple pitch detection (find dominant frequency)
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / (dataArray.length / 2);
    
    let maxAmplitude = 0;
    let dominantFrequency = 0;
    
    for (let i = 1; i < dataArray.length / 2; i++) {
      if (dataArray[i] > maxAmplitude) {
        maxAmplitude = dataArray[i];
        dominantFrequency = i * binSize;
      }
    }

    // Normalize pitch (0-1 scale, typical human voice range 80-1000 Hz)
    const pitch = Math.min(dominantFrequency / 1000, 1);

    // Calculate clarity based on signal-to-noise ratio
    const clarity = Math.min(volume * 2, 1);

    // Simple emotion detection based on pitch and volume patterns
    let emotion: VoiceAnalysisData['emotion'] = 'neutral';
    if (pitch > 0.6 && volume > 0.3) emotion = 'excited';
    else if (pitch > 0.4 && volume > 0.2) emotion = 'happy';
    else if (pitch < 0.2 && volume < 0.2) emotion = 'sad';
    else if (volume > 0.5) emotion = 'angry';

    return {
      volume: Math.min(volume * 2, 1),
      pitch,
      clarity,
      emotion,
      confidence: Math.min((volume + clarity) / 2, 1)
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        // Get final audio analysis
        const dataArray = new Uint8Array(analyserRef.current?.frequencyBinCount || 1024);
        analyserRef.current?.getByteFrequencyData(dataArray);
        const analysis = analyzeAudio(dataArray);

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        setIsProcessing(true);
        try {
          await onVoiceInput(audioBlob, analysis);
        } catch (error) {
          console.error('Error processing voice input:', error);
          message.error('Failed to process voice input');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start real-time analysis for visual feedback
      const updateAnalysis = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // You could emit real-time analysis here for visual feedback
          const analysis = analyzeAudio(dataArray);
          
          animationFrameRef.current = requestAnimationFrame(updateAnalysis);
        }
      };
      updateAnalysis();

    } catch (error) {
      console.error('Error starting recording:', error);
      message.error('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type={isRecording ? "danger" : "primary"}
      size="large"
      icon={isRecording ? <AudioOutlined className="animate-pulse" /> : <AudioMutedOutlined />}
      onClick={handleClick}
      disabled={disabled || isProcessing}
      loading={isProcessing}
      className={`${className} ${isRecording ? 'recording-button' : ''}`}
    >
      {isProcessing 
        ? 'Processing...' 
        : isRecording 
          ? 'Stop Recording' 
          : 'Start Recording'
      }
    </Button>
  );
}
