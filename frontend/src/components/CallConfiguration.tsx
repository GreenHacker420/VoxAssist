'use client';

import { useState } from 'react';
import { Card, Radio, Select, Button, Space, Typography, Row, Col } from 'antd';
import { PhoneOutlined, AppstoreOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface CallConfigurationProps {
  onStartCall?: (config: CallConfig) => void;
  onCreateWidget?: (config: CallConfig) => void;
}

export interface CallConfig {
  callType: 'voice' | 'widget';
  provider: 'twilio' | 'plivo' | 'vonage' | 'bandwidth';
  serviceType: 'voice' | 'whatsapp' | 'sms' | 'video';
}

export default function CallConfiguration({ onStartCall, onCreateWidget }: CallConfigurationProps) {
  const [config, setConfig] = useState<CallConfig>({
    callType: 'voice',
    provider: 'twilio',
    serviceType: 'voice',
  });

  const handleConfigChange = (key: keyof CallConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const providerOptions = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'plivo', label: 'Plivo' },
    { value: 'vonage', label: 'Vonage' },
    { value: 'bandwidth', label: 'Bandwidth' },
  ];

  const serviceTypeOptions = [
    { value: 'voice', label: 'Voice Call' },
    { value: 'whatsapp', label: 'WhatsApp Call' },
    { value: 'sms', label: 'SMS' },
    { value: 'video', label: 'Video Call' },
  ];

  return (
    <Card>
      <Title level={4}>Call Configuration</Title>
      <Row gutter={[24, 16]}>
        <Col xs={24} md={8}>
          <div>
            <Typography.Text strong>Call Type</Typography.Text>
            <Radio.Group
              value={config.callType}
              onChange={(e) => handleConfigChange('callType', e.target.value)}
              style={{ display: 'block', marginTop: 8 }}
            >
              <Radio value="voice" style={{ display: 'block', marginBottom: 8 }}>
                <PhoneOutlined style={{ marginRight: 8 }} />
                Voice Call
              </Radio>
              <Radio value="widget">
                <AppstoreOutlined style={{ marginRight: 8 }} />
                Call Widget
              </Radio>
            </Radio.Group>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div>
            <Typography.Text strong>Provider</Typography.Text>
            <Select
              value={config.provider}
              onChange={(value) => handleConfigChange('provider', value)}
              options={providerOptions}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div>
            <Typography.Text strong>Service Type</Typography.Text>
            <Select
              value={config.serviceType}
              onChange={(value) => handleConfigChange('serviceType', value)}
              options={serviceTypeOptions}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Space>
          <Button
            type="primary"
            icon={<PhoneOutlined />}
            onClick={() => onStartCall?.(config)}
          >
            Start Call
          </Button>
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => onCreateWidget?.(config)}
          >
            Create Widget
          </Button>
        </Space>
      </div>
    </Card>
  );
}
