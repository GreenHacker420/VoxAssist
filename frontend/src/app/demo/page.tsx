'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Typography, Space, Alert, Spin } from 'antd';
import { ExperimentOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Paragraph } = Typography;

export default function DemoPage() {
  const router = useRouter();
  const { isDemoMode, enableDemoMode } = useAuth();
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // If already in demo mode, redirect to widgets
    if (isDemoMode) {
      router.push('/widgets');
    }
  }, [isDemoMode, router]);

  const handleEnableDemo = async () => {
    setIsEnabling(true);
    
    try {
      // Enable demo mode
      enableDemoMode();
      
      // Small delay for UX
      setTimeout(() => {
        router.push('/widgets');
      }, 1000);
    } catch (error) {
      console.error('Failed to enable demo mode:', error);
      setIsEnabling(false);
    }
  };

  if (isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="text-center">
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Paragraph>Redirecting to demo dashboard...</Paragraph>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <Card 
        className="w-full max-w-2xl"
        style={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="text-center p-8">
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
          </div>
          
          <Title level={1} style={{ marginBottom: '16px' }}>
            Try VoxAssist Demo
          </Title>
          
          <Paragraph style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
            Experience VoxAssist's AI-powered calling features without creating an account. 
            Test real-time transcription, sentiment analysis, and voice widget management.
          </Paragraph>

          <Alert
            message="Demo Mode Features"
            description={
              <ul style={{ textAlign: 'left', marginTop: '12px', paddingLeft: '20px' }}>
                <li>Interactive demo calls with realistic conversations</li>
                <li>Real-time transcript and sentiment analysis</li>
                <li>Voice widget creation and management</li>
                <li>Live call monitoring dashboard</li>
                <li>All features work without external API calls</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: '32px', textAlign: 'left' }}
          />

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              icon={<ExperimentOutlined />}
              onClick={handleEnableDemo}
              loading={isEnabling}
              disabled={isEnabling}
              style={{ 
                height: '56px', 
                fontSize: '18px',
                borderRadius: '12px',
                paddingLeft: '32px',
                paddingRight: '32px',
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                border: 'none'
              }}
            >
              {isEnabling ? 'Enabling Demo Mode...' : 'Start Demo Experience'}
            </Button>

            <Button
              type="link"
              icon={<ArrowRightOutlined />}
              onClick={() => router.push('/login')}
              style={{ fontSize: '16px' }}
            >
              Or sign in to your account
            </Button>
          </Space>

          <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: '14px' }}>
              <strong>Note:</strong> Demo mode uses simulated data and doesn't require real phone numbers or API keys. 
              All demo calls are simulated conversations designed to showcase VoxAssist capabilities.
            </Paragraph>
          </div>
        </div>
      </Card>
    </div>
  );
}
