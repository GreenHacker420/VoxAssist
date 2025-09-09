'use client';

import { useState } from 'react';
import { Card, Form, Input, Select, Button, Switch, Typography, Space, Alert, message } from 'antd';
import { SaveOutlined, RestOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ProviderConfig {
  provider: 'twilio' | 'plivo' | 'vonage' | 'bandwidth';
  apiKey: string;
  apiSecret: string;
  accountSid?: string;
  authToken?: string;
  enabled: boolean;
}

interface ProviderSettingsProps {
  onSave?: (config: ProviderConfig) => void;
  onTest?: (config: ProviderConfig) => Promise<boolean>;
}

export default function ProviderSettings({ onSave, onTest }: ProviderSettingsProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('twilio');

  const providerOptions = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'plivo', label: 'Plivo' },
    { value: 'vonage', label: 'Vonage' },
    { value: 'bandwidth', label: 'Bandwidth' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const config: ProviderConfig = {
        provider: values.provider as 'twilio' | 'plivo' | 'vonage' | 'bandwidth',
        apiKey: values.apiKey as string,
        apiSecret: values.apiSecret as string,
        accountSid: values.accountSid as string | undefined,
        authToken: values.authToken as string | undefined,
        enabled: (values.enabled as boolean) ?? true,
      };
      
      await onSave?.(config);
      message.success('Provider settings saved successfully');
    } catch {
      message.error('Failed to save provider settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const values = await form.validateFields();
      const config: ProviderConfig = {
        provider: values.provider,
        apiKey: values.apiKey,
        apiSecret: values.apiSecret,
        accountSid: values.accountSid,
        authToken: values.authToken,
        enabled: values.enabled ?? true,
      };
      
      const success = await onTest?.(config);
      if (success) {
        message.success('Provider connection test successful');
      } else {
        message.error('Provider connection test failed');
      }
    } catch {
      message.error('Please fill in all required fields');
    } finally {
      setTestLoading(false);
    }
  };

  const renderProviderFields = () => {
    switch (selectedProvider) {
      case 'twilio':
        return (
          <>
            <Form.Item
              name="accountSid"
              label="Account SID"
              rules={[{ required: true, message: 'Please enter your Twilio Account SID' }]}
            >
              <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            </Form.Item>
            <Form.Item
              name="authToken"
              label="Auth Token"
              rules={[{ required: true, message: 'Please enter your Twilio Auth Token' }]}
            >
              <Input.Password placeholder="Your Twilio Auth Token" />
            </Form.Item>
          </>
        );
      case 'plivo':
        return (
          <>
            <Form.Item
              name="apiKey"
              label="Auth ID"
              rules={[{ required: true, message: 'Please enter your Plivo Auth ID' }]}
            >
              <Input placeholder="MAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            </Form.Item>
            <Form.Item
              name="apiSecret"
              label="Auth Token"
              rules={[{ required: true, message: 'Please enter your Plivo Auth Token' }]}
            >
              <Input.Password placeholder="Your Plivo Auth Token" />
            </Form.Item>
          </>
        );
      case 'vonage':
        return (
          <>
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: 'Please enter your Vonage API Key' }]}
            >
              <Input placeholder="Your Vonage API Key" />
            </Form.Item>
            <Form.Item
              name="apiSecret"
              label="API Secret"
              rules={[{ required: true, message: 'Please enter your Vonage API Secret' }]}
            >
              <Input.Password placeholder="Your Vonage API Secret" />
            </Form.Item>
          </>
        );
      case 'bandwidth':
        return (
          <>
            <Form.Item
              name="apiKey"
              label="User ID"
              rules={[{ required: true, message: 'Please enter your Bandwidth User ID' }]}
            >
              <Input placeholder="Your Bandwidth User ID" />
            </Form.Item>
            <Form.Item
              name="apiSecret"
              label="API Token"
              rules={[{ required: true, message: 'Please enter your Bandwidth API Token' }]}
            >
              <Input.Password placeholder="Your Bandwidth API Token" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <Title level={4}>Provider Settings</Title>
      <Alert
        message="Configure your communication provider"
        description="Set up your preferred provider credentials to enable voice calls, WhatsApp, SMS, and other services."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{ provider: 'twilio', enabled: true }}
      >
        <Form.Item
          name="provider"
          label="Provider"
          rules={[{ required: true, message: 'Please select a provider' }]}
        >
          <Select
            options={providerOptions}
            onChange={setSelectedProvider}
            placeholder="Select your communication provider"
          />
        </Form.Item>

        {renderProviderFields()}

        <Form.Item name="enabled" valuePropName="checked">
          <div className="flex items-center">
            <Switch />
            <Text style={{ marginLeft: 8 }}>Enable this provider</Text>
          </div>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Save Settings
            </Button>
            <Button
              icon={<RestOutlined />}
              loading={testLoading}
              onClick={handleTest}
            >
              Test Connection
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
