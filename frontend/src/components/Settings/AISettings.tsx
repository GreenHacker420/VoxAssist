'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Slider, 
  Switch, 
  Space, 
  Typography,
  Row,
  Col,
  Divider,
  InputNumber,
  App
} from 'antd';
import { 
  RobotOutlined, 
  SettingOutlined, 
  SaveOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableFunctionCalling: boolean;
  responseTimeout: number;
  fallbackModel: string;
  enableContextMemory: boolean;
  maxContextLength: number;
}

interface AISettingsProps {
  onSave?: (config: AIConfig) => Promise<void>;
  onTest?: (config: AIConfig) => Promise<boolean>;
}

export default function AISettings({ onSave, onTest }: AISettingsProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig>({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI assistant for voice calls. Be concise, professional, and engaging.',
    enableFunctionCalling: true,
    responseTimeout: 30,
    fallbackModel: 'gpt-3.5-turbo',
    enableContextMemory: true,
    maxContextLength: 4000
  });

  useEffect(() => {
    // Load existing configuration
    loadAIConfig();
  }, []);

  const loadAIConfig = async () => {
    try {
      // TODO: Implement API call to load AI configuration
      // const response = await fetch('/api/settings/ai');
      // const data = await response.json();
      // setConfig(data);
      // form.setFieldsValue(data);
      
      // For now, use default config
      form.setFieldsValue(config);
    } catch (error) {
      console.error('Failed to load AI configuration:', error);
      message.error('Failed to load AI configuration');
    }
  };

  const handleSave = async (values: AIConfig) => {
    setLoading(true);
    try {
      if (onSave) {
        await onSave(values);
      } else {
        // TODO: Implement default save logic
        // await fetch('/api/settings/ai', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(values)
        // });
      }
      setConfig(values);
      message.success('AI settings saved successfully');
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      message.error('Failed to save AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const values = form.getFieldsValue();
      let testResult = false;
      
      if (onTest) {
        testResult = await onTest(values);
      } else {
        // TODO: Implement default test logic
        // const response = await fetch('/api/settings/ai/test', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(values)
        // });
        // testResult = response.ok;
        testResult = true; // Mock success for now
      }
      
      if (testResult) {
        message.success('AI configuration test successful');
      } else {
        message.error('AI configuration test failed');
      }
    } catch (error) {
      console.error('AI test failed:', error);
      message.error('AI configuration test failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center space-x-2 mb-4">
          <RobotOutlined className="text-blue-600" />
          <Title level={4} className="!mb-0">AI Model Configuration</Title>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={config}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="model"
                label="Primary AI Model"
                rules={[{ required: true, message: 'Please select an AI model' }]}
              >
                <Select placeholder="Select AI model">
                  <Select.Option value="gpt-4">GPT-4</Select.Option>
                  <Select.Option value="gpt-4-turbo">GPT-4 Turbo</Select.Option>
                  <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                  <Select.Option value="claude-3-opus">Claude 3 Opus</Select.Option>
                  <Select.Option value="claude-3-sonnet">Claude 3 Sonnet</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="fallbackModel"
                label="Fallback Model"
                rules={[{ required: true, message: 'Please select a fallback model' }]}
              >
                <Select placeholder="Select fallback model">
                  <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                  <Select.Option value="gpt-4">GPT-4</Select.Option>
                  <Select.Option value="claude-3-haiku">Claude 3 Haiku</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="temperature"
                label="Temperature"
                tooltip="Controls randomness in responses (0.0 = deterministic, 1.0 = very creative)"
              >
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  marks={{
                    0: 'Deterministic',
                    0.5: 'Balanced',
                    1: 'Creative'
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="maxTokens"
                label="Max Tokens"
                tooltip="Maximum number of tokens in the response"
              >
                <InputNumber
                  min={100}
                  max={8000}
                  step={100}
                  className="w-full"
                  placeholder="2048"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="systemPrompt"
            label="System Prompt"
            tooltip="Instructions that guide the AI's behavior and personality"
          >
            <TextArea
              rows={4}
              placeholder="Enter system prompt for the AI assistant..."
            />
          </Form.Item>

          <Divider />

          <Title level={5}>Advanced Settings</Title>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="enableFunctionCalling"
                label="Function Calling"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Text type="secondary" className="text-xs">
                Allow AI to call external functions
              </Text>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="enableContextMemory"
                label="Context Memory"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Text type="secondary" className="text-xs">
                Remember conversation context
              </Text>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="responseTimeout"
                label="Response Timeout (seconds)"
              >
                <InputNumber
                  min={5}
                  max={120}
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="maxContextLength"
            label="Max Context Length"
            tooltip="Maximum number of characters to keep in conversation memory"
          >
            <InputNumber
              min={1000}
              max={10000}
              step={500}
              className="w-full"
              placeholder="4000"
            />
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              icon={<ExperimentOutlined />}
              onClick={handleTest}
              loading={testLoading}
            >
              Test Configuration
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Save Settings
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
