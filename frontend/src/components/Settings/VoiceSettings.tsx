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
  App,
  Upload,
  Progress
} from 'antd';
import { 
  SoundOutlined, 
  PlayCircleOutlined, 
  SaveOutlined,
  UploadOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface VoiceConfig {
  provider: string;
  voice: string;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
  enableSSML: boolean;
  customVoiceId?: string;
  pronunciationCorrections: Record<string, string>;
}

interface VoiceSettingsProps {
  onSave?: (config: VoiceConfig) => Promise<void>;
  onTest?: (config: VoiceConfig, text: string) => Promise<boolean>;
}

export default function VoiceSettings({ onSave, onTest }: VoiceSettingsProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testText, setTestText] = useState('Hello, this is a test of the voice settings. How does this sound?');
  const [config, setConfig] = useState<VoiceConfig>({
    provider: 'elevenlabs',
    voice: 'rachel',
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    enableSSML: true,
    pronunciationCorrections: {}
  });

  useEffect(() => {
    loadVoiceConfig();
  }, []);

  const loadVoiceConfig = async () => {
    try {
      const response = await fetch('/api/settings/voice', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        form.setFieldsValue(data);
      } else {
        form.setFieldsValue(config);
      }
    } catch (error) {
      console.error('Failed to load voice configuration:', error);
      form.setFieldsValue(config);
    }
  };

  const handleSave = async (values: VoiceConfig) => {
    setLoading(true);
    try {
      if (onSave) {
        await onSave(values);
      } else {
        const response = await fetch('/api/settings/voice', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save voice configuration');
        }
      }
      setConfig(values);
      message.success('Voice settings saved successfully');
    } catch (error) {
      console.error('Failed to save voice settings:', error);
      message.error('Failed to save voice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setIsPlaying(true);
    try {
      const values = form.getFieldsValue();
      let testResult = false;
      
      if (onTest) {
        testResult = await onTest(values, testText);
      } else {
        const response = await fetch('/api/settings/voice/test', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ ...values, testText })
        });
        
        if (!response.ok) {
          throw new Error('Voice test failed');
        }
        
        const result = await response.json();
        testResult = result.success;
        // Simulate audio playback
        setTimeout(() => setIsPlaying(false), 3000);
      }
      
      if (testResult) {
        message.success('Voice test completed successfully');
      } else {
        message.error('Voice test failed');
      }
    } catch (error) {
      console.error('Voice test failed:', error);
      message.error('Voice test failed');
    } finally {
      setTestLoading(false);
      setIsPlaying(false);
    }
  };

  const voiceOptions = {
    elevenlabs: [
      { value: 'rachel', label: 'Rachel (Female, American)' },
      { value: 'drew', label: 'Drew (Male, American)' },
      { value: 'clyde', label: 'Clyde (Male, American)' },
      { value: 'paul', label: 'Paul (Male, American)' },
      { value: 'domi', label: 'Domi (Female, American)' },
      { value: 'dave', label: 'Dave (Male, British)' },
      { value: 'fin', label: 'Fin (Male, Irish)' },
      { value: 'sarah', label: 'Sarah (Female, American)' }
    ],
    openai: [
      { value: 'alloy', label: 'Alloy (Neutral)' },
      { value: 'echo', label: 'Echo (Male)' },
      { value: 'fable', label: 'Fable (British Male)' },
      { value: 'onyx', label: 'Onyx (Male)' },
      { value: 'nova', label: 'Nova (Female)' },
      { value: 'shimmer', label: 'Shimmer (Female)' }
    ],
    azure: [
      { value: 'en-US-JennyNeural', label: 'Jenny (Female, American)' },
      { value: 'en-US-GuyNeural', label: 'Guy (Male, American)' },
      { value: 'en-US-AriaNeural', label: 'Aria (Female, American)' },
      { value: 'en-US-DavisNeural', label: 'Davis (Male, American)' },
      { value: 'en-GB-SoniaNeural', label: 'Sonia (Female, British)' },
      { value: 'en-GB-RyanNeural', label: 'Ryan (Male, British)' }
    ]
  };

  const selectedProvider = Form.useWatch('provider', form) || config.provider;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center space-x-2 mb-4">
          <SoundOutlined className="text-green-600" />
          <Title level={4} className="!mb-0">Voice Configuration</Title>
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
                name="provider"
                label="Voice Provider"
                rules={[{ required: true, message: 'Please select a voice provider' }]}
              >
                <Select placeholder="Select voice provider">
                  <Select.Option value="elevenlabs">ElevenLabs</Select.Option>
                  <Select.Option value="openai">OpenAI TTS</Select.Option>
                  <Select.Option value="azure">Azure Cognitive Services</Select.Option>
                  <Select.Option value="google">Google Cloud TTS</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="language"
                label="Language"
                rules={[{ required: true, message: 'Please select a language' }]}
              >
                <Select placeholder="Select language">
                  <Select.Option value="en-US">English (US)</Select.Option>
                  <Select.Option value="en-GB">English (UK)</Select.Option>
                  <Select.Option value="en-AU">English (Australia)</Select.Option>
                  <Select.Option value="es-ES">Spanish (Spain)</Select.Option>
                  <Select.Option value="es-MX">Spanish (Mexico)</Select.Option>
                  <Select.Option value="fr-FR">French (France)</Select.Option>
                  <Select.Option value="de-DE">German (Germany)</Select.Option>
                  <Select.Option value="it-IT">Italian (Italy)</Select.Option>
                  <Select.Option value="pt-BR">Portuguese (Brazil)</Select.Option>
                  <Select.Option value="ja-JP">Japanese (Japan)</Select.Option>
                  <Select.Option value="ko-KR">Korean (South Korea)</Select.Option>
                  <Select.Option value="zh-CN">Chinese (Simplified)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="voice"
            label="Voice"
            rules={[{ required: true, message: 'Please select a voice' }]}
          >
            <Select placeholder="Select voice">
              {voiceOptions[selectedProvider as keyof typeof voiceOptions]?.map(voice => (
                <Select.Option key={voice.value} value={voice.value}>
                  {voice.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Title level={5}>Voice Parameters</Title>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="speed"
                label="Speaking Speed"
                tooltip="Adjust how fast the voice speaks"
              >
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  marks={{
                    0.5: 'Slow',
                    1.0: 'Normal',
                    2.0: 'Fast'
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="pitch"
                label="Voice Pitch"
                tooltip="Adjust the pitch of the voice"
              >
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  marks={{
                    0.5: 'Low',
                    1.0: 'Normal',
                    2.0: 'High'
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="volume"
                label="Volume"
                tooltip="Adjust the volume level"
              >
                <Slider
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks={{
                    0.1: 'Quiet',
                    0.5: 'Medium',
                    1.0: 'Loud'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>Advanced Settings</Title>

          <Form.Item
            name="enableSSML"
            label="Enable SSML"
            valuePropName="checked"
            tooltip="Speech Synthesis Markup Language for advanced voice control"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Custom Voice Upload"
            tooltip="Upload a custom voice model (ElevenLabs only)"
          >
            <Upload
              name="voice"
              accept=".wav,.mp3"
              showUploadList={false}
              disabled={selectedProvider !== 'elevenlabs'}
            >
              <Button icon={<UploadOutlined />} disabled={selectedProvider !== 'elevenlabs'}>
                Upload Custom Voice
              </Button>
            </Upload>
            <Text type="secondary" className="text-xs block mt-1">
              Supported formats: WAV, MP3 (ElevenLabs only)
            </Text>
          </Form.Item>

          <Divider />

          <Title level={5}>Voice Test</Title>
          
          <Form.Item label="Test Text">
            <Input.TextArea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              placeholder="Enter text to test the voice settings..."
            />
          </Form.Item>

          {isPlaying && (
            <div className="mb-4">
              <Progress percent={66} status="active" />
              <Text type="secondary">Playing voice sample...</Text>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <Button 
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleTest}
              loading={testLoading}
              disabled={!testText.trim()}
            >
              {isPlaying ? 'Stop Test' : 'Test Voice'}
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
