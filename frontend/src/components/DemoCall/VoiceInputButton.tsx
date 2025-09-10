import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Progress, Space, Typography, Card } from 'antd';
import { AudioOutlined, StopOutlined, SoundOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AudioQualityMetrics {
  volume: number;
  clarity: number;
  duration: number;
  sampleRate: number;
  bitRate: number;
}

interface VoiceInputButtonProps {
  onVoiceInput: (audioData: string, format: string, metrics: AudioQualityMetrics) => void;
  disabled?: boolean;
  className?: string;
  showMetrics?: boolean;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onVoiceInput,
  disabled = false,
  className = '',
  showMetrics = true
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioMetrics, setAudioMetrics] = useState<AudioQualityMetrics>({
    volume: 0,
    clarity: 0,
    duration: 0,
    sampleRate: 0,
    bitRate: 0
  });
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Audio quality analysis
  const analyzeAudioQuality = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const volume = Math.sqrt(sum / bufferLength) / 255 * 100;

    // Calculate clarity (high frequency content)
    const highFreqStart = Math.floor(bufferLength * 0.6);
    let highFreqSum = 0;
    for (let i = highFreqStart; i < bufferLength; i++) {
      highFreqSum += dataArray[i];
    }
    const clarity = (highFreqSum / (bufferLength - highFreqStart)) / 255 * 100;

    // Update duration
    const currentDuration = (Date.now() - recordingStartTimeRef.current) / 1000;

    setAudioMetrics(prev => ({
      ...prev,
      volume: Math.round(volume),
      clarity: Math.round(clarity),
      duration: Math.round(currentDuration * 10) / 10
    }));

    setRecordingDuration(Math.round(currentDuration));

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudioQuality);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          // Calculate final metrics
          const finalMetrics: AudioQualityMetrics = {
            ...audioMetrics,
            duration: (Date.now() - recordingStartTimeRef.current) / 1000,
            sampleRate: audioContextRef.current?.sampleRate || 44100,
            bitRate: 128000
          };

          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            const base64Audio = base64Data.split(',')[1]; // Remove data:audio/webm;base64, prefix

            onVoiceInput(base64Audio, 'webm', finalMetrics);
            setIsProcessing(false);
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          setIsProcessing(false);
        }

        // Clean up
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Start audio quality analysis
      analyzeAudioQuality();

      console.log('Voice recording started with quality analysis');
    } catch (error) {
      console.error('Error starting voice recording:', error);
    }
  }, [onVoiceInput, analyzeAudioQuality, audioMetrics]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Voice recording stopped');
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Stop Recording';
    return 'Start Voice Input';
  };

  const getButtonIcon = () => {
    if (isProcessing) return null;
    if (isRecording) return <StopOutlined />;
    return <AudioOutlined />;
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button
        type={isRecording ? 'primary' : 'default'}
        danger={isRecording}
        icon={getButtonIcon()}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        loading={isProcessing}
        className={`voice-input-button ${className}`}
        size="large"
        style={{ width: '100%' }}
      >
        {getButtonText()}
        {isRecording && (
          <Text style={{ marginLeft: 8, color: 'white' }}>
            {recordingDuration}s
          </Text>
        )}
      </Button>

      {showMetrics && isRecording && (
        <Card size="small" style={{ marginTop: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong>
                <SoundOutlined /> Volume
              </Text>
              <Progress
                percent={audioMetrics.volume}
                size="small"
                style={{ width: 120 }}
                strokeColor={audioMetrics.volume > 70 ? '#52c41a' : audioMetrics.volume > 30 ? '#faad14' : '#ff4d4f'}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong>Clarity</Text>
              <Progress
                percent={audioMetrics.clarity}
                size="small"
                style={{ width: 120 }}
                strokeColor={audioMetrics.clarity > 60 ? '#52c41a' : audioMetrics.clarity > 30 ? '#faad14' : '#ff4d4f'}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Duration: {audioMetrics.duration}s</Text>
              <Text type="secondary">Quality: {audioMetrics.volume > 50 && audioMetrics.clarity > 40 ? 'Good' : 'Fair'}</Text>
            </div>
          </Space>
        </Card>
      )}
    </Space>
  );
};

export default VoiceInputButton;
