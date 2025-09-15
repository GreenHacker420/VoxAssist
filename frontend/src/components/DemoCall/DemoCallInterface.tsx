'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Alert,
  Row,
  Col
} from 'antd';
import {
  PhoneOutlined,
  InfoCircleOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { CallsService } from '@/services/calls';
import RealTimeVoiceInterface from '@/components/VoiceConversation/RealTimeVoiceInterface';

const { Title, Text } = Typography;

export default function DemoCallInterface() {
  const { user } = useAuth();
  const [callId, setCallId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(true);

  // Initialize demo call
  useEffect(() => {
    const initializeDemoCall = async () => {
      try {
        if (user) {
          const demoCallId = `demo-call-${Date.now()}`;
          setCallId(demoCallId);
        }
      } catch (error) {
        console.error('Failed to initialize demo call:', error);
        setError('Failed to initialize demo call. Please try again.');
      }
    };

    initializeDemoCall();
  }, [user]);

  const handleVoiceStateChange = (state: { status: string; messages: unknown[] }) => {
    // Handle voice conversation state changes
    console.log('Voice conversation state changed:', state);
  };

  const handleError = (error: string) => {
    console.error('Voice conversation error:', error);
    setError(error);
  };

  if (!user) {
    return (
      <Card>
        <Alert
          message="Authentication Required"
          description="Please log in to access the demo call feature."
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div className="demo-call-interface">
      <Row gutter={[16, 16]}>
        {/* Demo Mode Toggle */}
        <Col xs={24}>
          <Card size="small">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExperimentOutlined className="text-xl text-blue-500" />
                <div>
                  <Title level={5} className="mb-0">VoxAssist Voice Demo</Title>
                  <Text type="secondary" className="text-sm">
                    Experience real-time voice conversation with AI
                  </Text>
                </div>
              </div>
              <Space>
                <Button
                  type={isVoiceMode ? 'primary' : 'default'}
                  size="small"
                  icon={<PhoneOutlined />}
                  onClick={() => setIsVoiceMode(true)}
                >
                  Voice Demo
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Demo Content */}
        <Col xs={24}>
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className="mb-4"
            />
          )}

          {isVoiceMode ? (
            <Card>
              <div className="mb-4">
                <Alert
                  message="Real-Time Voice Conversation"
                  description="This demo uses advanced voice recognition and AI to provide natural conversation experience. Click 'Start Conversation' to begin."
                  type="info"
                  showIcon
                />
              </div>

              {callId && (
                <RealTimeVoiceInterface
                  callId={callId}
                  onStateChange={handleVoiceStateChange}
                  onError={handleError}
                />
              )}
            </Card>
          ) : (
            <Card>
              <div className="text-center py-8">
                <InfoCircleOutlined className="text-4xl text-blue-500 mb-4" />
                <Title level={4}>Basic Demo Mode</Title>
                <Text type="secondary">
                  Switch to Voice Demo to experience real-time voice conversation with AI.
                </Text>
                <div className="mt-4">
                  <Button
                    type="primary"
                    icon={<PhoneOutlined />}
                    onClick={() => setIsVoiceMode(true)}
                  >
                    Try Voice Demo
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
