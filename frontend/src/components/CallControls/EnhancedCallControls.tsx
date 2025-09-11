'use client';

import { useState } from 'react';
import { Button, Space, Tooltip, Badge, Drawer, Progress, Statistic, Card, Row, Col } from 'antd';
import {
  PhoneOutlined,
  AudioMutedOutlined,
  AudioOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SwapOutlined,
  VideoCameraOutlined,
  StopOutlined,
  SettingOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedCallControlsProps {
  callStatus: 'active' | 'completed' | 'escalated' | 'failed' | 'initiated' | 'ringing';
  onCallEnd: () => void;
  callDuration?: number;
  isRecording?: boolean;
  isMuted?: boolean;
  isOnHold?: boolean;
}

export default function EnhancedCallControls({
  callStatus,
  onCallEnd,
  callDuration = 0,
  isRecording: initialRecording = false,
  isMuted: initialMuted = false,
  isOnHold: initialHold = false,
}: EnhancedCallControlsProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isOnHold, setIsOnHold] = useState(initialHold);
  const [isRecording, setIsRecording] = useState(initialRecording);
  const [showSettings, setShowSettings] = useState(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleHold = () => {
    setIsOnHold(!isOnHold);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
  };

  const handleTransfer = () => {
    // Transfer functionality would be implemented here
  };

  const handleHangup = () => {
    onCallEnd();
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'active':
        return '#52c41a';
      case 'ringing':
        return '#1890ff';
      case 'completed':
        return '#52c41a';
      case 'failed':
        return '#ff4d4f';
      case 'escalated':
        return '#fa8c16';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'active':
        return 'Active Call';
      case 'ringing':
        return 'Ringing...';
      case 'completed':
        return 'Call Completed';
      case 'failed':
        return 'Call Failed';
      case 'escalated':
        return 'Escalated';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <Card 
        className="shadow-lg border-0"
        bodyStyle={{ padding: '24px' }}
      >
        {/* Call Status Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Badge 
              status="processing" 
              color={getStatusColor()}
              text={
                <span className="text-lg font-semibold text-gray-900">
                  {getStatusText()}
                </span>
              }
            />

          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-gray-900">
                {formatDuration(callDuration)}
              </div>
              <div className="text-xs text-gray-500">Duration</div>
            </div>
            {isRecording && (
              <div className="flex items-center space-x-1 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">REC</span>
              </div>
            )}
          </div>
        </div>

        {/* Call Quality Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Call Quality</span>
            <span className="text-sm font-medium text-green-600">Excellent</span>
          </div>
          <Progress 
            percent={92} 
            strokeColor="#52c41a" 
            showInfo={false}
            size="small"
          />
        </div>

        {/* Main Control Buttons */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={8}>
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <Button
                type={isMuted ? 'primary' : 'default'}
                danger={isMuted}
                icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                onClick={handleMute}
                size="large"
                className="w-full h-12"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
            </Tooltip>
          </Col>
          
          <Col span={8}>
            <Tooltip title={isOnHold ? 'Resume' : 'Hold'}>
              <Button
                type={isOnHold ? 'primary' : 'default'}
                icon={isOnHold ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                onClick={handleHold}
                size="large"
                className="w-full h-12"
              >
                {isOnHold ? 'Resume' : 'Hold'}
              </Button>
            </Tooltip>
          </Col>
          
          <Col span={8}>
            <Tooltip title={isRecording ? 'Stop Recording' : 'Start Recording'}>
              <Button
                type={isRecording ? 'primary' : 'default'}
                danger={isRecording}
                icon={isRecording ? <StopOutlined /> : <VideoCameraOutlined />}
                onClick={handleRecord}
                size="large"
                className="w-full h-12"
              >
                {isRecording ? 'Stop' : 'Record'}
              </Button>
            </Tooltip>
          </Col>
        </Row>

        {/* Secondary Actions */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={12}>
            <Tooltip title="Transfer Call">
              <Button
                icon={<SwapOutlined />}
                onClick={handleTransfer}
                size="large"
                className="w-full"
              >
                Transfer
              </Button>
            </Tooltip>
          </Col>
          
          <Col span={12}>
            <Tooltip title="Call Settings">
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(true)}
                size="large"
                className="w-full"
              >
                Settings
              </Button>
            </Tooltip>
          </Col>
        </Row>

        {/* End Call Button */}
        <Button
          type="primary"
          danger
          icon={<PhoneOutlined />}
          onClick={handleHangup}
          size="large"
          className="w-full h-12 text-lg font-semibold"
        >
          End Call
        </Button>
      </Card>

      {/* Settings Drawer */}
      <Drawer
        title="Call Settings"
        placement="right"
        onClose={() => setShowSettings(false)}
        open={showSettings}
        width={400}
      >
        <Space direction="vertical" size="large" className="w-full">
          <Card size="small" title="Audio Settings">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between items-center">
                <span>Microphone Volume</span>
                <Progress percent={85} size="small" className="w-24" />
              </div>
              <div className="flex justify-between items-center">
                <span>Speaker Volume</span>
                <Progress percent={70} size="small" className="w-24" />
              </div>
            </Space>
          </Card>

          <Card size="small" title="Call Statistics">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Duration"
                  value={formatDuration(callDuration)}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Quality"
                  value={92}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>


        </Space>
      </Drawer>
    </>
  );
}
