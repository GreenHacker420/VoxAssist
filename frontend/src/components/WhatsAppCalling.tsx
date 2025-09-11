'use client';

import { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  App, 
  Alert
} from 'antd';
import { 
  WhatsAppOutlined, 
  PhoneOutlined, 
  SendOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;

interface WhatsAppCallingProps {
  onCallInitiated?: (phoneNumber: string) => void;
}

export default function WhatsAppCalling({ onCallInitiated }: WhatsAppCallingProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const initiateWhatsAppCall = async (values: { phoneNumber: string; message?: string }) => {
    if (!user) {
      message.error('Please log in to make WhatsApp calls');
      return;
    }

    setLoading(true);
    try {
      // For now, just show a success message since WhatsApp integration is complex
      message.success('WhatsApp call feature is coming soon!');
      form.resetFields();
      onCallInitiated?.(values.phoneNumber);
    } catch (error) {
      console.error('Error initiating WhatsApp call:', error);
      message.error('Failed to initiate WhatsApp call');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <Alert
          message="Authentication Required"
          description="Please log in to access WhatsApp calling features."
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title level={4} className="!mb-2 flex items-center">
              <WhatsAppOutlined className="mr-2 text-green-500" />
              WhatsApp Business Calling
            </Title>
            <Text type="secondary">
              Send messages and initiate calls through WhatsApp Business API
            </Text>
          </div>
        </div>

        <Alert
          message="WhatsApp Integration Coming Soon"
          description="WhatsApp Business API integration is currently under development. This feature will allow you to send messages and initiate calls through WhatsApp."
          type="info"
          showIcon
          className="mb-6"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={initiateWhatsAppCall}
          disabled={true}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="phoneNumber"
                label="WhatsApp Number"
                rules={[
                  { required: true, message: 'Please enter a phone number' },
                  { pattern: /^\+?[1-9]\d{1,14}$/, message: 'Please enter a valid phone number' }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="+1234567890"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="message"
                label="Initial Message (Optional)"
              >
                <Input.TextArea
                  placeholder="Hello! I'm reaching out from VoxAssist..."
                  rows={3}
                  maxLength={1000}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={loading}
                size="large"
                disabled={true}
              >
                Send WhatsApp Message
              </Button>
              <Button
                icon={<WhatsAppOutlined />}
                loading={loading}
                size="large"
                disabled={true}
              >
                Initiate WhatsApp Call
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <Title level={5} className="!mb-2">
            WhatsApp Business Features (Coming Soon)
          </Title>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Send rich media messages (text, images, documents)</li>
            <li>Initiate voice and video calls</li>
            <li>Template message support</li>
            <li>Real-time message status tracking</li>
            <li>Integration with customer support workflows</li>
            <li>Automated responses and chatbots</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
