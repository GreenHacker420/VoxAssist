'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, Space, Typography } from 'antd';
import { PhoneOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import DemoCallInterface from './DemoCallInterface';

const { Text } = Typography;

interface QuickDemoCallButtonProps {
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  block?: boolean;
  className?: string;
}

export default function QuickDemoCallButton({ 
  size = 'middle', 
  type = 'primary',
  block = false,
  className = ''
}: QuickDemoCallButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleQuickDemo = () => {
    if (!user) {
      // Redirect to login
      router.push('/login');
      return;
    }
    
    setShowDemoModal(true);
  };

  return (
    <>
      <Button
        type={type}
        size={size}
        icon={<PhoneOutlined />}
        onClick={handleQuickDemo}
        block={block}
        className={className}
      >
        {user ? 'Try Demo Call' : 'Login for Demo'}
      </Button>

      <Modal
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
            <span>VoxAssist Demo Call</span>
          </Space>
        }
        open={showDemoModal}
        onCancel={() => setShowDemoModal(false)}
        footer={null}
        width={1200}
        centered
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Experience VoxAssist&apos;s AI-powered calling features with real-time transcript and sentiment analysis.
            This demo simulates a realistic customer support conversation.
          </Text>
        </div>
        
        <DemoCallInterface />
      </Modal>
    </>
  );
}
