'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  message, 
  Modal, 
  List, 
  Tag, 
  Alert
} from 'antd';
import { 
  WhatsAppOutlined, 
  PhoneOutlined, 
  SendOutlined, 
  HistoryOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

type JSONObject = Record<string, unknown>;

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  businessAccountId: string;
}

interface CallHistoryItem {
  id: string;
  phoneNumber: string;
  eventType: string;
  timestamp: string;
  metadata: JSONObject;
}

interface WhatsAppCallingProps {
  onCallInitiated?: (phoneNumber: string) => void;
}

interface WhatsAppAccountConfig {
  id: string;
  provider: string;
  phoneNumber: string;
  verifiedName: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | string;
}

export default function WhatsAppCalling({ onCallInitiated }: WhatsAppCallingProps) {
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppAccountConfig | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/whatsapp/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.configured) {
        setConfigured(true);
        setWhatsappConfig(data.config);
      }
    } catch (error) {
      console.error('Error checking WhatsApp configuration:', error);
    }
  };

  const handleConfigureWhatsApp = async (values: WhatsAppConfig) => {
    setConfigLoading(true);
    try {
      const response = await fetch('/api/whatsapp/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();

      if (data.success) {
        message.success('WhatsApp configured successfully!');
        setConfigured(true);
        setWhatsappConfig(data.config);
        setConfigModalVisible(false);
        configForm.resetFields();
      } else {
        message.error(data.error || 'Failed to configure WhatsApp');
      }
    } catch (error) {
      console.error('Error configuring WhatsApp:', error);
      message.error('Failed to configure WhatsApp');
    } finally {
      setConfigLoading(false);
    }
  };

  const testWhatsAppConnection = async () => {
    const values = configForm.getFieldsValue();
    
    if (!values.accessToken || !values.phoneNumberId) {
      message.error('Please fill in Access Token and Phone Number ID');
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          accessToken: values.accessToken,
          phoneNumberId: values.phoneNumberId
        })
      });

      const data = await response.json();

      if (data.success) {
        message.success(`Connection successful! Phone: ${data.phoneNumber}, Name: ${data.verifiedName}`);
      } else {
        message.error(data.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing WhatsApp connection:', error);
      message.error('Connection test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const initiateWhatsAppCall = async (values: { phoneNumber: string; message?: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          phoneNumber: values.phoneNumber,
          callOptions: {
            headerText: 'Voice Call Request',
            bodyText: values.message || 'Click to start voice call with our support team',
            footerText: 'Powered by VoxAssist'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        message.success('WhatsApp call initiated successfully!');
        form.resetFields();
        onCallInitiated?.(values.phoneNumber);
      } else {
        message.error(data.error || 'Failed to initiate WhatsApp call');
      }
    } catch (error) {
      console.error('Error initiating WhatsApp call:', error);
      message.error('Failed to initiate WhatsApp call');
    } finally {
      setLoading(false);
    }
  };

  const sendCallMessage = async (values: { phoneNumber: string; message?: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/send-call-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          phoneNumber: values.phoneNumber,
          messageOptions: {
            headerText: 'Voice Call Available',
            bodyText: values.message || 'We are ready to assist you via voice call.',
            languageCode: 'en_US'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        message.success('WhatsApp call message sent successfully!');
        form.resetFields();
      } else {
        message.error(data.error || 'Failed to send WhatsApp call message');
      }
    } catch (error) {
      console.error('Error sending WhatsApp call message:', error);
      message.error('Failed to send WhatsApp call message');
    } finally {
      setLoading(false);
    }
  };

  const loadCallHistory = async () => {
    try {
      const response = await fetch('/api/whatsapp/call-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCallHistory(data.data);
        setHistoryModalVisible(true);
      } else {
        message.error('Failed to load call history');
      }
    } catch (error) {
      console.error('Error loading call history:', error);
      message.error('Failed to load call history');
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'call_initiated': return 'blue';
      case 'call_delivered': return 'green';
      case 'call_read': return 'cyan';
      case 'call_failed': return 'red';
      case 'incoming_call_accepted': return 'purple';
      default: return 'default';
    }
  };

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4}>
            <WhatsAppOutlined style={{ color: '#25D366', marginRight: 8 }} />
            WhatsApp Calling
          </Title>
          <Space>
            <Button 
              icon={<HistoryOutlined />} 
              onClick={loadCallHistory}
              disabled={!configured}
            >
              Call History
            </Button>
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setConfigModalVisible(true)}
            >
              Configure
            </Button>
          </Space>
        </div>

        {!configured && (
          <Alert
            message="WhatsApp Not Configured"
            description="Please configure your WhatsApp Business API credentials to start making calls."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => setConfigModalVisible(true)}>
                Configure Now
              </Button>
            }
          />
        )}

        {configured && whatsappConfig && (
          <Alert
            message="WhatsApp Configured"
            description={`Connected to ${whatsappConfig.phoneNumber} (${whatsappConfig.verifiedName})`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={initiateWhatsAppCall}
          disabled={!configured}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Please enter phone number' },
                  { pattern: /^\+?[1-9]\d{1,14}$/, message: 'Please enter valid phone number with country code' }
                ]}
              >
                <Input 
                  placeholder="+1234567890" 
                  prefix={<PhoneOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="message"
                label="Custom Message (Optional)"
              >
                <Input.TextArea 
                  placeholder="Custom message for the call invitation"
                  rows={3}
                />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<WhatsAppOutlined />}
              loading={loading}
              disabled={!configured}
            >
              Initiate WhatsApp Call
            </Button>
            <Button
              icon={<SendOutlined />}
              onClick={() => {
                const values = form.getFieldsValue();
                if (values.phoneNumber) {
                  sendCallMessage(values);
                } else {
                  message.error('Please enter phone number');
                }
              }}
              loading={loading}
              disabled={!configured}
            >
              Send Call Message
            </Button>
          </Space>
        </Form>
      </Card>

      {/* Configuration Modal */}
      <Modal
        title="Configure WhatsApp Business API"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Alert
          message="WhatsApp Business API Setup"
          description="You need a WhatsApp Business Account and approved Business Solution Provider (BSP) to use this feature."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={configForm}
          layout="vertical"
          onFinish={handleConfigureWhatsApp}
        >
          <Form.Item
            name="accessToken"
            label="Access Token"
            rules={[{ required: true, message: 'Please enter access token' }]}
          >
            <Input.Password placeholder="Your WhatsApp Business API access token" />
          </Form.Item>

          <Form.Item
            name="phoneNumberId"
            label="Phone Number ID"
            rules={[{ required: true, message: 'Please enter phone number ID' }]}
          >
            <Input placeholder="Your WhatsApp Business phone number ID" />
          </Form.Item>

          <Form.Item
            name="webhookVerifyToken"
            label="Webhook Verify Token"
          >
            <Input placeholder="Webhook verification token (optional)" />
          </Form.Item>

          <Form.Item
            name="businessAccountId"
            label="Business Account ID"
          >
            <Input placeholder="Your WhatsApp Business Account ID (optional)" />
          </Form.Item>

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={configLoading}
              icon={<CheckCircleOutlined />}
            >
              Save Configuration
            </Button>
            <Button
              onClick={testWhatsAppConnection}
              loading={testLoading}
              icon={<ExclamationCircleOutlined />}
            >
              Test Connection
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Call History Modal */}
      <Modal
        title="WhatsApp Call History"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={700}
      >
        <List
          dataSource={callHistory}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.phoneNumber}</Text>
                    <Tag color={getEventTypeColor(item.eventType)}>
                      {item.eventType.replace('_', ' ').toUpperCase()}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                    {item.metadata && (
                      <div style={{ marginTop: 4 }}>
                        <Text code>{JSON.stringify(item.metadata, null, 2)}</Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No call history found' }}
        />
      </Modal>
    </div>
  );
}
