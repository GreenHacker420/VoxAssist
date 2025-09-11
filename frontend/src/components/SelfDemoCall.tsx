'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Typography, Space, Alert, Steps, Spin, App } from 'antd';
import {
  PhoneOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { CallsService } from '@/services/calls';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

export default function SelfDemoCall() {
  const { message } = App.useApp();
  const [isInitiating, setIsInitiating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [callStatus, setCallStatus] = useState<string>('');
  const [demoCallId, setDemoCallId] = useState<string>('');
  const router = useRouter();
  const { user } = useAuth();

  const demoSteps = [
    {
      title: 'Initialize Call',
      description: 'Setting up your self-demo call'
    },
    {
      title: 'Connect',
      description: 'Establishing connection'
    },
    {
      title: 'Experience Features',
      description: 'Live call monitoring and AI interaction'
    }
  ];

  // Listen for demo call state updates
  useEffect(() => {
    const handleCallStateUpdate = (event: CustomEvent) => {
      const { callId, newState, call } = event.detail;
      if (callId === demoCallId) {
        setCallStatus(newState);

        // Update steps based on call state
        if (newState === 'connecting') {
          setCurrentStep(1);
        } else if (newState === 'active') {
          setCurrentStep(2);
        } else if (newState === 'ended') {
          setCurrentStep(3);
          setIsInitiating(false);
          message.success('Demo call completed! Redirecting to call details...');
          setTimeout(() => {
            router.push(`/calls/live/${callId}`);
          }, 2000);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('demoCallStateUpdate', handleCallStateUpdate as EventListener);
      return () => {
        window.removeEventListener('demoCallStateUpdate', handleCallStateUpdate as EventListener);
      };
    }
  }, [demoCallId, router]);

  const handleStartSelfDemo = async () => {
    setIsInitiating(true);
    setCurrentStep(0);
    setCallStatus('ringing');

    try {
      // Step 1: Initialize call
      const call = await CallsService.startDemoCall();
      setDemoCallId(call.id);
      message.success('Self-demo call initiated!');
      setCurrentStep(1);

      // Step 2: Simulate connection delay
      setTimeout(() => {
        setCurrentStep(2);
        message.success('Connected! Redirecting to live call view...');
        
        // Step 3: Redirect to live call monitoring
        setTimeout(() => {
          router.push(`/calls/live/${call.id}`);
        }, 1500);
      }, 2000);

    } catch (error) {
      console.error('Failed to start self-demo call:', error);
      message.error('Failed to start self-demo call');
      setCurrentStep(0);
    } finally {
      setTimeout(() => {
        setIsInitiating(false);
      }, 4000);
    }
  };



  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={3}>
          <PhoneOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          Try VoxAssist Yourself
        </Title>
        
        <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto 24px' }}>
          Experience VoxAssist firsthand with a self-demo call. This will initiate a simulated call 
          where you can see all the features in action - real-time transcription, sentiment analysis, 
          AI responses, and call controls.
        </Paragraph>

        {isInitiating && (
          <div style={{ margin: '24px 0' }}>
            <Steps
              current={currentStep}
              items={demoSteps}
              style={{ maxWidth: '500px', margin: '0 auto 24px' }}
            />
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
              tip="Setting up your demo call..."
            />
          </div>
        )}

        <Space direction="vertical" size="large">
          <div>
            <Title level={4} style={{ color: '#52c41a', margin: '16px 0 8px' }}>
              <CheckCircleOutlined style={{ marginRight: 8 }} />
              What You&apos;ll Experience:
            </Title>
            <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Real-time call transcription
                </li>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Live sentiment analysis with emotion detection
                </li>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Interactive call controls (mute, hold, transfer)
                </li>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  AI-powered conversation insights
                </li>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Call escalation and handoff features
                </li>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Real-time audio waveform visualization
                </li>
                <li style={{ padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  Performance analytics and call quality metrics
                </li>
              </ul>
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStartSelfDemo}
            loading={isInitiating}
            disabled={isInitiating}
            style={{ 
              height: '48px', 
              fontSize: '16px', 
              paddingLeft: '32px', 
              paddingRight: '32px' 
            }}
          >
            {isInitiating ? 'Initiating Demo Call...' : 'Start Self-Demo Call'}
          </Button>

          <Text type="secondary" style={{ fontSize: '14px' }}>
            This demo call will simulate a realistic conversation and showcase all VoxAssist features
          </Text>
        </Space>
      </div>
    </Card>
  );
}
