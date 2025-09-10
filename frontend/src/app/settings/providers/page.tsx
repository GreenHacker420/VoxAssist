'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Switch, 
  Alert, 
  Typography, 
  Space, 
  Divider,
  Badge,
  Tooltip,
  Modal,
  message
} from 'antd';
import { 
  PhoneOutlined, 
  SafetyCertificateOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ExperimentOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { ProvidersService } from '@/services/providers';
import { isDemoMode } from '@/demo';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Password } = Input;

interface ProviderConfig {
  id?: string;
  name: string;
  type: 'phone' | 'whatsapp';
  provider: 'twilio' | 'plivo' | 'ringg' | 'sarvam';
  isActive: boolean;
  isPrimary: boolean;
  credentials: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  settings: {
    region?: string;
    enableRecording?: boolean;
    enableTranscription?: boolean;
  };
}

const PROVIDER_INFO = {
  twilio: {
    name: 'Twilio',
    description: 'Global cloud communications platform',
    website: 'https://www.twilio.com',
    credentialsHelp: {
      accountSid: 'Found in your Twilio Console Dashboard',
      authToken: 'Found in your Twilio Console Dashboard',
      phoneNumber: 'Your Twilio phone number (e.g., +1234567890)'
    }
  },
  plivo: {
    name: 'Plivo',
    description: 'Cloud communication APIs',
    website: 'https://www.plivo.com',
    credentialsHelp: {
      accountSid: 'Your Plivo Auth ID from the dashboard',
      authToken: 'Your Plivo Auth Token from the dashboard',
      phoneNumber: 'Your Plivo phone number'
    }
  },
  ringg: {
    name: 'Ringg AI',
    description: 'AI-powered calling platform',
    website: 'https://ringg.ai',
    credentialsHelp: {
      apiKey: 'Your Ringg AI API key',
      apiSecret: 'Your Ringg AI API secret'
    }
  },
  sarvam: {
    name: 'Sarvam AI',
    description: 'Indian language AI platform',
    website: 'https://sarvam.ai',
    credentialsHelp: {
      apiKey: 'Your Sarvam AI API key',
      apiSecret: 'Your Sarvam AI API secret'
    }
  }
} as const;

export default function ProvidersPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('twilio');
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connected' | 'disconnected' | 'testing'>>({});

  useEffect(() => {
    loadProviderConfigs();
  }, []);

  const loadProviderConfigs = async () => {
    try {
      setLoading(true);
      if (isDemoMode()) {
        // Demo data
        setConfigs([
          {
            id: 'demo-twilio',
            name: 'Demo Twilio Config',
            type: 'phone',
            provider: 'twilio',
            isActive: true,
            isPrimary: true,
            credentials: {
              accountSid: 'AC***demo***',
              authToken: '***demo***',
              phoneNumber: '+1234567890'
            },
            settings: {
              region: 'us1',
              enableRecording: true,
              enableTranscription: true
            }
          }
        ]);
        setConnectionStatus({ 'demo-twilio': 'connected' });
      } else {
        const response = await ProvidersService.getConfigs();
        setConfigs(response);
        
        // Check connection status for each config
        const statusPromises = response.map(async (config) => {
          try {
            const status = await ProvidersService.testConnection(config.id!);
            return {
              id: config.id!,
              status: (status.connected ? 'connected' : 'disconnected') as 'connected' | 'disconnected' | 'testing'
            };
          } catch {
            return {
              id: config.id!,
              status: 'disconnected' as 'connected' | 'disconnected' | 'testing'
            };
          }
        });

        const statuses = await Promise.all(statusPromises);
        const statusMap = statuses.reduce((acc, { id, status }) => {
          acc[id] = status;
          return acc;
        }, {} as Record<string, 'connected' | 'disconnected' | 'testing'>);
        
        setConnectionStatus(statusMap);
      }
    } catch (error) {
      message.error('Failed to load provider configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      
      if (isDemoMode()) {
        message.success('Demo configuration saved successfully!');
        return;
      }

      const config: ProviderConfig = {
        name: values.name as string,
        type: values.type as 'phone' | 'whatsapp',
        provider: values.provider as 'twilio' | 'plivo' | 'ringg' | 'sarvam',
        isActive: values.isActive as boolean,
        isPrimary: values.isPrimary as boolean,
        credentials: {
          accountSid: values.accountSid as string,
          authToken: values.authToken as string,
          phoneNumber: values.phoneNumber as string,
          apiKey: values.apiKey as string,
          apiSecret: values.apiSecret as string
        },
        settings: {
          region: values.region as string,
          enableRecording: values.enableRecording as boolean,
          enableTranscription: values.enableTranscription as boolean
        }
      };

      await ProvidersService.createConfig(config);
      message.success('Provider configuration saved successfully!');
      form.resetFields();
      loadProviderConfigs();
    } catch (error) {
      message.error('Failed to save provider configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (configId: string) => {
    try {
      setTesting(true);
      setConnectionStatus(prev => ({ ...prev, [configId]: 'testing' }));
      
      if (isDemoMode()) {
        // Simulate testing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        setConnectionStatus(prev => ({ ...prev, [configId]: 'connected' }));
        message.success('Demo connection test successful!');
        return;
      }

      const result = await ProvidersService.testConnection(configId);
      
      if (result.connected) {
        setConnectionStatus(prev => ({ ...prev, [configId]: 'connected' }));
        message.success('Connection test successful!');
      } else {
        setConnectionStatus(prev => ({ ...prev, [configId]: 'disconnected' }));
        message.error(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [configId]: 'disconnected' }));
      message.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge status="success" text="Connected" />;
      case 'testing':
        return <Badge status="processing" text="Testing..." />;
      case 'disconnected':
      default:
        return <Badge status="error" text="Disconnected" />;
    }
  };

  const renderCredentialFields = (provider: string) => {
    const info = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO];
    
    switch (provider) {
      case 'twilio':
        return (
          <>
            <Form.Item
              name="accountSid"
              label={
                <Space>
                  Account SID
                  <Tooltip title={'accountSid' in info.credentialsHelp ? info.credentialsHelp.accountSid : 'Account SID'}>
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: 'Please enter your Twilio Account SID' }]}
            >
              <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            </Form.Item>
            
            <Form.Item
              name="authToken"
              label={
                <Space>
                  Auth Token
                  <Tooltip title={'authToken' in info.credentialsHelp ? info.credentialsHelp.authToken : 'Auth Token'}>
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: 'Please enter your Twilio Auth Token' }]}
            >
              <Password 
                placeholder="Your Twilio Auth Token"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
            
            <Form.Item
              name="phoneNumber"
              label={
                <Space>
                  Phone Number
                  <Tooltip title={'phoneNumber' in info.credentialsHelp ? info.credentialsHelp.phoneNumber : 'Phone Number'}>
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: 'Please enter your Twilio phone number' }]}
            >
              <Input placeholder="+1234567890" />
            </Form.Item>
          </>
        );
        
      case 'plivo':
        return (
          <>
            <Form.Item
              name="accountSid"
              label="Auth ID"
              rules={[{ required: true, message: 'Please enter your Plivo Auth ID' }]}
            >
              <Input placeholder="Your Plivo Auth ID" />
            </Form.Item>
            
            <Form.Item
              name="authToken"
              label="Auth Token"
              rules={[{ required: true, message: 'Please enter your Plivo Auth Token' }]}
            >
              <Password placeholder="Your Plivo Auth Token" />
            </Form.Item>
            
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[{ required: true, message: 'Please enter your Plivo phone number' }]}
            >
              <Input placeholder="+1234567890" />
            </Form.Item>
          </>
        );
        
      case 'ringg':
      case 'sarvam':
        return (
          <>
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: `Please enter your ${info.name} API key` }]}
            >
              <Input placeholder={`Your ${info.name} API key`} />
            </Form.Item>
            
            <Form.Item
              name="apiSecret"
              label="API Secret"
              rules={[{ required: true, message: `Please enter your ${info.name} API secret` }]}
            >
              <Password placeholder={`Your ${info.name} API secret`} />
            </Form.Item>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Title level={2} className="!mb-2">
              <PhoneOutlined className="mr-3" />
              Provider Configuration
            </Title>
            <Paragraph className="!mb-0 text-gray-600">
              Configure and manage your calling service providers for VoxAssist.
            </Paragraph>
          </div>
        </div>

        {isDemoMode() && (
          <Alert
            message="Demo Mode Active"
            description="You're in demo mode. Provider configurations will be simulated and not saved to a real database."
            type="info"
            showIcon
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Existing Configurations */}
          <div className="lg:col-span-1">
            <Card title="Active Configurations" className="h-fit">
              {configs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PhoneOutlined className="text-4xl mb-4 opacity-50" />
                  <Text>No providers configured</Text>
                </div>
              ) : (
                <Space direction="vertical" className="w-full">
                  {configs.map((config) => (
                    <Card
                      key={config.id}
                      size="small"
                      className="border-l-4 border-l-blue-500"
                      extra={
                        <Space>
                          {getStatusBadge(connectionStatus[config.id!] || 'disconnected')}
                          <Button
                            size="small"
                            icon={<ExperimentOutlined />}
                            loading={connectionStatus[config.id!] === 'testing'}
                            onClick={() => handleTestConnection(config.id!)}
                          >
                            Test
                          </Button>
                        </Space>
                      }
                    >
                      <div>
                        <Text strong>{config.name}</Text>
                        <br />
                        <Text type="secondary" className="text-sm">
                          {PROVIDER_INFO[config.provider].name} • {config.type}
                        </Text>
                        {config.isPrimary && (
                          <Badge count="Primary" className="ml-2" />
                        )}
                      </div>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </div>

          {/* Configuration Form */}
          <div className="lg:col-span-2">
            <Card title="Add New Provider Configuration">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSaveConfig}
                initialValues={{
                  type: 'phone',
                  provider: 'twilio',
                  isActive: true,
                  isPrimary: false,
                  enableRecording: true,
                  enableTranscription: false,
                  region: 'us1'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="name"
                    label="Configuration Name"
                    rules={[{ required: true, message: 'Please enter a configuration name' }]}
                  >
                    <Input placeholder="e.g., Production Twilio" />
                  </Form.Item>

                  <Form.Item
                    name="type"
                    label="Service Type"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="phone">Voice Calling</Option>
                      <Option value="whatsapp">WhatsApp</Option>
                    </Select>
                  </Form.Item>
                </div>

                <Form.Item
                  name="provider"
                  label="Provider"
                  rules={[{ required: true }]}
                >
                  <Select onChange={setSelectedProvider}>
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                      <Option key={key} value={key}>
                        <Space>
                          {info.name}
                          <Text type="secondary" className="text-sm">
                            {info.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Divider orientation="left">
                  <SafetyCertificateOutlined /> Credentials
                </Divider>

                {renderCredentialFields(selectedProvider)}

                <Divider orientation="left">Settings</Divider>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item name="region" label="Region">
                    <Select>
                      <Option value="us1">US East (Virginia)</Option>
                      <Option value="us2">US West (Oregon)</Option>
                      <Option value="eu1">Europe (Ireland)</Option>
                      <Option value="ap1">Asia Pacific (Singapore)</Option>
                    </Select>
                  </Form.Item>

                  <div className="space-y-4">
                    <Form.Item name="isActive" valuePropName="checked">
                      <div className="flex items-center gap-2">
                        <Switch />
                        <span>Active</span>
                      </div>
                    </Form.Item>

                    <Form.Item name="isPrimary" valuePropName="checked">
                      <div className="flex items-center gap-2">
                        <Switch />
                        <span>Set as Primary</span>
                      </div>
                    </Form.Item>

                    <Form.Item name="enableRecording" valuePropName="checked">
                      <div className="flex items-center gap-2">
                        <Switch />
                        <span>Enable Recording</span>
                      </div>
                    </Form.Item>

                    <Form.Item name="enableTranscription" valuePropName="checked">
                      <div className="flex items-center gap-2">
                        <Switch />
                        <span>Enable Transcription</span>
                      </div>
                    </Form.Item>
                  </div>
                </div>

                <Form.Item className="mb-0 pt-4">
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<CheckCircleOutlined />}
                    >
                      Save Configuration
                    </Button>
                    <Button onClick={() => form.resetFields()}>
                      Reset
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
