import React from 'react';
import { Card, Row, Col, Progress, Tag, Typography, Space, Divider, Statistic } from 'antd';
import { 
  SoundOutlined, 
  HeartOutlined, 
  BulbOutlined, 
  ClockCircleOutlined,
  SignalFilled,
  AudioOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

export interface VoiceAnalysisData {
  sentiment: {
    overall: string;
    score: number;
    confidence: number;
  };
  emotion: {
    primary: string;
    intensity: string;
    confidence: number;
  };
  intent: {
    category: string;
    specific: string;
    urgency: string;
    confidence: number;
  };
  keywords: string[];
  summary: string;
  recommendedResponse: string;
  audioMetrics: {
    volume: number;
    clarity: number;
    duration: number;
    sampleRate: number;
    bitRate: number;
    overallQuality: string;
  };
  timestamp?: string;
}

interface VoiceAnalysisDisplayProps {
  analysis: VoiceAnalysisData | null;
  transcription?: {
    text: string;
    confidence: number;
  };
  className?: string;
}

export const VoiceAnalysisDisplay: React.FC<VoiceAnalysisDisplayProps> = ({
  analysis,
  transcription,
  className = ''
}) => {
  if (!analysis) {
    return (
      <Card className={className} size="small">
        <Text type="secondary">No voice analysis data available</Text>
      </Card>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return '#52c41a';
      case 'negative': return '#ff4d4f';
      default: return '#faad14';
    }
  };

  const getEmotionColor = (emotion: string) => {
    const emotionColors: { [key: string]: string } = {
      happy: '#52c41a',
      satisfied: '#52c41a',
      neutral: '#faad14',
      confused: '#faad14',
      frustrated: '#ff7a45',
      angry: '#ff4d4f',
      sad: '#722ed1'
    };
    return emotionColors[emotion.toLowerCase()] || '#faad14';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      default: return '#52c41a';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality.toLowerCase()) {
      case 'excellent': return '#52c41a';
      case 'good': return '#52c41a';
      case 'fair': return '#faad14';
      default: return '#ff4d4f';
    }
  };

  return (
    <div className={className}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Transcription Section */}
        {transcription && (
          <Card size="small" title={<><AudioOutlined /> Transcription</>}>
            <Text strong>&quot;{transcription.text}&quot;</Text>
            <br />
            <Text type="secondary">
              Confidence: {Math.round(transcription.confidence)}%
            </Text>
          </Card>
        )}

        {/* Main Analysis Grid */}
        <Row gutter={[16, 16]}>
          {/* Sentiment Analysis */}
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title={<><HeartOutlined /> Sentiment</>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color={getSentimentColor(analysis.sentiment.overall)} style={{ fontSize: '14px', padding: '4px 8px' }}>
                  {analysis.sentiment.overall.toUpperCase()}
                </Tag>
                <Progress
                  percent={Math.round(analysis.sentiment.score * 100)}
                  size="small"
                  strokeColor={getSentimentColor(analysis.sentiment.overall)}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Confidence: {Math.round(analysis.sentiment.confidence * 100)}%
                </Text>
              </Space>
            </Card>
          </Col>

          {/* Emotion Detection */}
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title={<><HeartOutlined /> Emotion</>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color={getEmotionColor(analysis.emotion.primary)} style={{ fontSize: '14px', padding: '4px 8px' }}>
                  {analysis.emotion.primary.toUpperCase()}
                </Tag>
                <Text>Intensity: <Text strong>{analysis.emotion.intensity}</Text></Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Confidence: {Math.round(analysis.emotion.confidence * 100)}%
                </Text>
              </Space>
            </Card>
          </Col>

          {/* Intent Analysis */}
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title={<><BulbOutlined /> Intent</>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="blue" style={{ fontSize: '12px' }}>
                  {analysis.intent.category.replace('_', ' ').toUpperCase()}
                </Tag>
                <Text style={{ fontSize: '12px' }}>{analysis.intent.specific}</Text>
                <Tag color={getUrgencyColor(analysis.intent.urgency)}>
                  {analysis.intent.urgency} urgency
                </Tag>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Audio Quality Metrics */}
        <Card size="small" title={<><SoundOutlined /> Audio Quality</>}>
          <Row gutter={[16, 8]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Volume"
                value={analysis.audioMetrics.volume}
                suffix="%"
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Clarity"
                value={analysis.audioMetrics.clarity}
                suffix="%"
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Duration"
                value={analysis.audioMetrics.duration}
                suffix="s"
                precision={1}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Overall Quality</Text>
                <br />
                <Tag color={getQualityColor(analysis.audioMetrics.overallQuality)} style={{ marginTop: '4px' }}>
                  {analysis.audioMetrics.overallQuality.toUpperCase()}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Keywords and Summary */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="Keywords">
              <Space wrap>
                {analysis.keywords.map((keyword, index) => (
                  <Tag key={index} color="geekblue">
                    {keyword}
                  </Tag>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="Summary">
              <Text style={{ fontSize: '12px' }}>{analysis.summary}</Text>
            </Card>
          </Col>
        </Row>

        {/* Recommended Response */}
        <Card size="small" title="Recommended Response Approach">
          <Text italic style={{ fontSize: '12px' }}>
            {analysis.recommendedResponse}
          </Text>
          {analysis.timestamp && (
            <>
              <Divider type="vertical" />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                <ClockCircleOutlined /> {new Date(analysis.timestamp).toLocaleTimeString()}
              </Text>
            </>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default VoiceAnalysisDisplay;
