'use client';

import { Card, Progress, Space, Typography, Row, Col } from 'antd';
import { 
  SoundOutlined, 
  SignalFilled, 
  HeartOutlined,
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export interface VoiceAnalysisData {
  volume: number;
  pitch: number;
  clarity: number;
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited';
  confidence: number;
}

interface VoiceAnalysisDisplayProps {
  analysis: VoiceAnalysisData;
}

export default function VoiceAnalysisDisplay({ analysis }: VoiceAnalysisDisplayProps) {
  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return <SmileOutlined style={{ color: '#52c41a' }} />;
      case 'sad':
        return <FrownOutlined style={{ color: '#1890ff' }} />;
      case 'angry':
        return <ThunderboltOutlined style={{ color: '#ff4d4f' }} />;
      case 'excited':
        return <HeartOutlined style={{ color: '#eb2f96' }} />;
      default:
        return <MehOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return '#52c41a';
      case 'sad':
        return '#1890ff';
      case 'angry':
        return '#ff4d4f';
      case 'excited':
        return '#eb2f96';
      default:
        return '#faad14';
    }
  };

  const getVolumeColor = (volume: number) => {
    if (volume > 0.7) return '#ff4d4f';
    if (volume > 0.4) return '#faad14';
    return '#52c41a';
  };

  const getPitchColor = (pitch: number) => {
    if (pitch > 0.7) return '#eb2f96';
    if (pitch > 0.3) return '#1890ff';
    return '#52c41a';
  };

  return (
    <Card title="Voice Analysis" size="small">
      <Space direction="vertical" className="w-full" size="small">
        {/* Volume */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Space size="small">
              <SoundOutlined />
              <Text className="text-xs">Volume</Text>
            </Space>
            <Text className="text-xs">{Math.round(analysis.volume * 100)}%</Text>
          </div>
          <Progress
            percent={Math.round(analysis.volume * 100)}
            strokeColor={getVolumeColor(analysis.volume)}
            size="small"
            showInfo={false}
          />
        </div>

        {/* Pitch */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Space size="small">
              <SignalFilled />
              <Text className="text-xs">Pitch</Text>
            </Space>
            <Text className="text-xs">{Math.round(analysis.pitch * 100)}%</Text>
          </div>
          <Progress
            percent={Math.round(analysis.pitch * 100)}
            strokeColor={getPitchColor(analysis.pitch)}
            size="small"
            showInfo={false}
          />
        </div>

        {/* Clarity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Space size="small">
              <SignalFilled />
              <Text className="text-xs">Clarity</Text>
            </Space>
            <Text className="text-xs">{Math.round(analysis.clarity * 100)}%</Text>
          </div>
          <Progress
            percent={Math.round(analysis.clarity * 100)}
            strokeColor="#1890ff"
            size="small"
            showInfo={false}
          />
        </div>

        {/* Emotion */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Space size="small">
              {getEmotionIcon(analysis.emotion)}
              <Text className="text-xs">Emotion</Text>
            </Space>
            <Text className="text-xs capitalize">{analysis.emotion}</Text>
          </div>
          <div 
            className="h-2 rounded-full"
            style={{ 
              backgroundColor: getEmotionColor(analysis.emotion),
              opacity: 0.8
            }}
          />
        </div>

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Space size="small">
              <SignalFilled />
              <Text className="text-xs">Confidence</Text>
            </Space>
            <Text className="text-xs">{Math.round(analysis.confidence * 100)}%</Text>
          </div>
          <Progress
            percent={Math.round(analysis.confidence * 100)}
            strokeColor="#722ed1"
            size="small"
            showInfo={false}
          />
        </div>
      </Space>
    </Card>
  );
}
