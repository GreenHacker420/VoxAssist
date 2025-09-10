'use client';

import { useState } from 'react';
import { 
  Form, 
  Input, 
  Card, 
  Row, 
  Col, 
  Button, 
  Space, 
  Typography, 
  Alert,
  Spin,
  Tag,
  Tooltip
} from 'antd';
import { 
  InfoCircleOutlined, 
  GlobalOutlined, 
  SearchOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface BasicInfoStepProps {
  formData: {
    name: string;
    contextUrl: string;
  };
  onChange: (data: Partial<{ name: string; contextUrl: string }>) => void;
  onAnalyzeWebsite: (url: string) => Promise<void>;
  websiteInfo?: {
    title?: string;
    colors?: string[];
    favicon?: string;
    description?: string;
  } | null;
}

export default function BasicInfoStep({ 
  formData, 
  onChange, 
  onAnalyzeWebsite,
  websiteInfo 
}: BasicInfoStepProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      setUrlValid(true);
      return true;
    } catch {
      setUrlValid(url.length > 0 ? false : null);
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onChange({ contextUrl: url });
    validateUrl(url);
  };

  const handleAnalyze = async () => {
    if (!formData.contextUrl || !validateUrl(formData.contextUrl)) {
      return;
    }

    setAnalyzing(true);
    try {
      await onAnalyzeWebsite(formData.contextUrl);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <Title level={3} className="!mb-3 !text-gray-900">
          Let's start with the basics
        </Title>
        <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
          Tell us about your widget and where it will be used. We'll analyze your website to suggest optimal styling.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card className="h-full bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <Form layout="vertical">
              <Form.Item
                label={
                  <Space>
                    <Text strong>Widget Name</Text>
                    <Tooltip title="Choose a descriptive name for your widget">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                required
              >
                <Input
                  size="large"
                  placeholder="e.g., Customer Support Chat"
                  value={formData.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text strong>Website URL</Text>
                    <Tooltip title="The website where this widget will be embedded">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
              >
                <Input
                  size="large"
                  placeholder="https://your-website.com"
                  value={formData.contextUrl}
                  onChange={handleUrlChange}
                  prefix={<GlobalOutlined className="text-gray-400" />}
                  suffix={
                    urlValid === true ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : urlValid === false ? (
                      <ExclamationCircleOutlined className="text-red-500" />
                    ) : null
                  }
                  className="rounded-lg"
                />
                {urlValid === false && (
                  <Text type="danger" className="text-sm mt-1">
                    Please enter a valid URL starting with http:// or https://
                  </Text>
                )}
              </Form.Item>

              {formData.contextUrl && urlValid && (
                <Form.Item>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleAnalyze}
                    loading={analyzing}
                    className="rounded-lg"
                  >
                    {analyzing ? 'Analyzing Website...' : 'Analyze Website'}
                  </Button>
                  <Text type="secondary" className="block text-sm mt-2">
                    We'll analyze your website to suggest optimal colors and styling
                  </Text>
                </Form.Item>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="h-full bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <Title level={4} className="!mb-4 !text-gray-900">
              <InfoCircleOutlined className="mr-2 text-blue-500" />
              Quick Tips
            </Title>
            
            <div className="space-y-4">
              <Alert
                message="Choose a Clear Name"
                description="Use a descriptive name that helps you identify this widget later, especially if you plan to create multiple widgets."
                type="info"
                showIcon
                className="rounded-lg"
              />
              
              <Alert
                message="Website Analysis"
                description="Providing your website URL allows us to automatically detect your brand colors and suggest optimal widget styling."
                type="success"
                showIcon
                className="rounded-lg"
              />

              {websiteInfo && (
                <Card size="small" className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200/50 backdrop-blur-sm">
                  <Title level={5} className="!mb-2 text-green-700">
                    <CheckCircleOutlined className="mr-2" />
                    Website Analyzed Successfully!
                  </Title>
                  <div className="space-y-2">
                    {websiteInfo.title && (
                      <div>
                        <Text strong>Title: </Text>
                        <Text>{websiteInfo.title}</Text>
                      </div>
                    )}
                    {websiteInfo.description && (
                      <div>
                        <Text strong>Description: </Text>
                        <Text>{websiteInfo.description}</Text>
                      </div>
                    )}
                    {websiteInfo.colors && websiteInfo.colors.length > 0 && (
                      <div>
                        <Text strong>Detected Colors: </Text>
                        <Space>
                          {websiteInfo.colors.map((color, index) => (
                            <div
                              key={index}
                              className="inline-block w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50 backdrop-blur-sm shadow-lg">
        <Row gutter={16} align="middle">
          <Col>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
              <InfoCircleOutlined className="text-blue-600 text-xl" />
            </div>
          </Col>
          <Col flex={1}>
            <Title level={5} className="!mb-1 !text-gray-900">
              What happens next?
            </Title>
            <Text type="secondary" className="text-gray-600">
              After completing the basic information, you'll customize the appearance,
              configure behavior settings, set permissions, and preview your widget before deployment.
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
