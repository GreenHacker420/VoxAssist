'use client';

import { 
  Card, 
  Row, 
  Col, 
  Switch, 
  Input, 
  Select, 
  Slider, 
  Typography, 
  Space, 
  Divider,
  Alert,
  Form,
  Tooltip
} from 'antd';
import { 
  SettingOutlined, 
  MessageOutlined, 
  SoundOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  GlobalOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface BehaviorStepProps {
  formData: {
    behavior: {
      autoOpen: boolean;
      autoOpenDelay: number;
      greeting: string;
      language: string;
      enableVoice: boolean;
      enableText: boolean;
      enableFileUpload: boolean;
      showBranding: boolean;
    };
  };
  onChange: (data: any) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { value: 'ko', label: 'Korean', flag: '🇰🇷' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
];

const GREETING_TEMPLATES = [
  "Hi! How can I help you today?",
  "Welcome! What can I assist you with?",
  "Hello! I'm here to help. What do you need?",
  "Hey there! Got any questions for me?",
  "Welcome to our support chat! How can I help?",
  "Hi! I'm your AI assistant. What would you like to know?",
];

export default function BehaviorStep({ formData, onChange }: BehaviorStepProps) {
  const updateBehavior = (key: string, value: any) => {
    onChange({
      behavior: {
        ...formData.behavior,
        [key]: value
      }
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <Title level={3} className="!mb-3 !text-gray-900">
          Configure widget behavior
        </Title>
        <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
          Set up how your widget interacts with visitors and customize the user experience
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* Auto-Open Settings */}
        <Col xs={24} lg={12}>
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <Title level={4} className="!mb-4 !text-gray-900">
              <ClockCircleOutlined className="mr-2 text-blue-500" />
              Auto-Open Settings
            </Title>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>Auto-open widget</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    Automatically open the chat after page load
                  </Text>
                </div>
                <Switch
                  checked={formData.behavior.autoOpen}
                  onChange={(checked) => updateBehavior('autoOpen', checked)}
                />
              </div>

              {formData.behavior.autoOpen && (
                <div>
                  <Text strong className="block mb-2">
                    Delay (seconds)
                  </Text>
                  <Slider
                    min={0}
                    max={30}
                    value={formData.behavior.autoOpenDelay / 1000}
                    onChange={(value) => updateBehavior('autoOpenDelay', value * 1000)}
                    marks={{
                      0: '0s',
                      5: '5s',
                      10: '10s',
                      15: '15s',
                      30: '30s'
                    }}
                  />
                  <Text type="secondary" className="text-sm">
                    Wait {formData.behavior.autoOpenDelay / 1000} seconds before opening
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Communication Features */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={4} className="!mb-4">
              <MessageOutlined className="mr-2 text-green-500" />
              Communication Features
            </Title>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageOutlined className="text-blue-500" />
                  <div>
                    <Text strong>Text Chat</Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      Enable text-based conversations
                    </Text>
                  </div>
                </div>
                <Switch
                  checked={formData.behavior.enableText}
                  onChange={(checked) => updateBehavior('enableText', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SoundOutlined className="text-purple-500" />
                  <div>
                    <Text strong>Voice Chat</Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      Enable voice conversations
                    </Text>
                  </div>
                </div>
                <Switch
                  checked={formData.behavior.enableVoice}
                  onChange={(checked) => updateBehavior('enableVoice', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileTextOutlined className="text-orange-500" />
                  <div>
                    <Text strong>File Upload</Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      Allow users to upload files
                    </Text>
                  </div>
                </div>
                <Switch
                  checked={formData.behavior.enableFileUpload}
                  onChange={(checked) => updateBehavior('enableFileUpload', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Text strong>Show VoxAssist Branding</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    Display "Powered by VoxAssist" link
                  </Text>
                </div>
                <Switch
                  checked={formData.behavior.showBranding}
                  onChange={(checked) => updateBehavior('showBranding', checked)}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Greeting Message */}
        <Col xs={24}>
          <Card>
            <Title level={4} className="!mb-4">
              <MessageOutlined className="mr-2 text-indigo-500" />
              Greeting Message
            </Title>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Form.Item label="Custom greeting message">
                  <TextArea
                    rows={3}
                    value={formData.behavior.greeting}
                    onChange={(e) => updateBehavior('greeting', e.target.value)}
                    placeholder="Enter your custom greeting message..."
                    className="rounded-lg"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} lg={8}>
                <Text strong className="block mb-2">Quick Templates</Text>
                <div className="space-y-2">
                  {GREETING_TEMPLATES.map((template, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition text-sm"
                      onClick={() => updateBehavior('greeting', template)}
                    >
                      {template}
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Language Settings */}
        <Col xs={24}>
          <Card>
            <Title level={4} className="!mb-4">
              <GlobalOutlined className="mr-2 text-cyan-500" />
              Language & Localization
            </Title>
            
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} lg={8}>
                <Form.Item label="Widget Language">
                  <Select
                    value={formData.behavior.language}
                    onChange={(value) => updateBehavior('language', value)}
                    className="w-full"
                    size="large"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <Option key={lang.value} value={lang.value}>
                        <Space>
                          <span>{lang.flag}</span>
                          {lang.label}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={16}>
                <Alert
                  message="Language Support"
                  description="The widget interface and AI responses will be displayed in the selected language. Voice recognition and synthesis will also use this language setting."
                  type="info"
                  showIcon
                  className="rounded-lg"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Feature Recommendations */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <Row gutter={16} align="middle">
          <Col>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <InfoCircleOutlined className="text-green-600 text-xl" />
            </div>
          </Col>
          <Col flex={1}>
            <Title level={5} className="!mb-1">
              Optimization Tips
            </Title>
            <div className="space-y-1">
              <Text type="secondary" className="block text-sm">
                • Enable both text and voice for maximum accessibility
              </Text>
              <Text type="secondary" className="block text-sm">
                • Use auto-open sparingly to avoid interrupting user experience
              </Text>
              <Text type="secondary" className="block text-sm">
                • Customize greeting messages to match your brand voice
              </Text>
              <Text type="secondary" className="block text-sm">
                • Consider your audience when selecting the widget language
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
