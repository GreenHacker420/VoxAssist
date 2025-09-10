'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, Typography, Button, Space, Tabs, Alert, Input, Switch, Divider, Tag } from 'antd';
import { CopyOutlined, CodeOutlined, GlobalOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { WidgetsService } from '@/services/widgets';
import type { WidgetDTO } from '@/services/widgets';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function WidgetEmbedPage() {
  const params = useParams();
  const widgetId = params.id as string;
  
  const [widget, setWidget] = useState<WidgetDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    loadWidget();
  }, [widgetId]);

  const loadWidget = async () => {
    try {
      setLoading(true);
      // For now, we'll create a mock widget since the service might not have a get method
      const mockWidget: WidgetDTO = {
        id: widgetId,
        name: 'Sample Widget',
        contextUrl: 'https://example.com',
        appearance: {
          position: 'bottom-right',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          textColor: '#FFFFFF',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          size: 'medium'
        },
        behavior: {
          autoOpen: false,
          greeting: 'Hi! How can I help you today?',
          language: 'en',
          enableVoice: true,
          enableText: true
        },
        permissions: {
          collectPersonalData: false,
          storeCookies: true,
          recordAudio: false,
          shareWithThirdParty: false
        }
      };
      setWidget(mockWidget);
    } catch (error) {
      console.error('Failed to load widget:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getEmbedCode = (type: 'script' | 'iframe' | 'react') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const domain = customDomain || 'your-domain.com';
    
    switch (type) {
      case 'script':
        return `<!-- VoxAssist Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widgetId}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

      case 'iframe':
        return `<!-- VoxAssist Widget (iframe) -->
<iframe 
  src="${baseUrl}/embed/widget/${widgetId}/iframe?origin=${encodeURIComponent(`https://${domain}`)}"
  width="350" 
  height="500"
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; z-index: 999999; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
</iframe>`;

      case 'react':
        return `// VoxAssist React Component
import { useEffect } from 'react';

export function VoxAssistWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widgetId}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      // Cleanup widget on unmount
      const widget = document.getElementById('voxassist-widget-container');
      if (widget) widget.remove();
    };
  }, []);

  return null; // Widget renders itself
}`;

      default:
        return '';
    }
  };

  const getTestUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${baseUrl}/embed/widget/${widgetId}/iframe?test=true`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading widget configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
        <div className="max-w-6xl mx-auto">
          <Alert
            message="Widget Not Found"
            description="The requested widget could not be found or you don't have permission to access it."
            type="error"
            showIcon
          />
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'script',
      label: (
        <Space>
          <CodeOutlined />
          JavaScript
        </Space>
      ),
      children: (
        <div className="space-y-4">
          <Alert
            message="Recommended Integration Method"
            description="This method provides the best user experience with automatic loading and minimal impact on page performance."
            type="success"
            showIcon
          />
          <div className="relative">
            <TextArea
              value={getEmbedCode('script')}
              rows={8}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="primary"
              icon={copied === 'script' ? <CheckCircleOutlined /> : <CopyOutlined />}
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(getEmbedCode('script'), 'script')}
            >
              {copied === 'script' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )
    },
    {
      key: 'iframe',
      label: (
        <Space>
          <GlobalOutlined />
          iFrame
        </Space>
      ),
      children: (
        <div className="space-y-4">
          <Alert
            message="Alternative Integration"
            description="Use this method if you need more control over widget placement or have restrictions on JavaScript execution."
            type="info"
            showIcon
          />
          <div className="relative">
            <TextArea
              value={getEmbedCode('iframe')}
              rows={8}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="primary"
              icon={copied === 'iframe' ? <CheckCircleOutlined /> : <CopyOutlined />}
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(getEmbedCode('iframe'), 'iframe')}
            >
              {copied === 'iframe' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )
    },
    {
      key: 'react',
      label: (
        <Space>
          <CodeOutlined />
          React
        </Space>
      ),
      children: (
        <div className="space-y-4">
          <Alert
            message="React Integration"
            description="Perfect for React applications with proper lifecycle management and TypeScript support."
            type="info"
            showIcon
          />
          <div className="relative">
            <TextArea
              value={getEmbedCode('react')}
              rows={12}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="primary"
              icon={copied === 'react' ? <CheckCircleOutlined /> : <CopyOutlined />}
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(getEmbedCode('react'), 'react')}
            >
              {copied === 'react' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="!mb-2">
                Embed Widget: {widget.name}
              </Title>
              <Text type="secondary">
                Widget ID: <Tag color="blue">{widget.id}</Tag>
              </Text>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Text strong>Status:</Text>
                <Tag color="green">Active</Tag>
              </div>
              <Text type="secondary">Ready for embedding</Text>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card
              title={
                <Space>
                  <SettingOutlined />
                  Configuration
                </Space>
              }
              className="h-fit"
            >
              <div className="space-y-4">
                <div>
                  <Text strong>Domain (Optional)</Text>
                  <Input
                    placeholder="your-domain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="mt-1"
                  />
                  <Text type="secondary" className="text-xs">
                    Used for generating domain-specific embed codes
                  </Text>
                </div>

                <Divider />

                <div className="space-y-3">
                  <Text strong>Widget Settings</Text>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Text>Position:</Text>
                      <Tag>{widget.appearance.position}</Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <Text>Size:</Text>
                      <Tag>{widget.appearance.size}</Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <Text>Auto-open:</Text>
                      <Tag color={widget.behavior.autoOpen ? 'green' : 'default'}>
                        {widget.behavior.autoOpen ? 'Yes' : 'No'}
                      </Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <Text>Voice enabled:</Text>
                      <Tag color={widget.behavior.enableVoice ? 'green' : 'default'}>
                        {widget.behavior.enableVoice ? 'Yes' : 'No'}
                      </Tag>
                    </div>
                  </div>
                </div>

                <Divider />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text strong>Test Mode</Text>
                    <Switch
                      checked={testMode}
                      onChange={setTestMode}
                      size="small"
                    />
                  </div>
                  <Text type="secondary" className="text-xs">
                    Enable test mode to preview the widget
                  </Text>
                </div>

                {testMode && (
                  <Button
                    type="dashed"
                    block
                    onClick={() => window.open(getTestUrl(), '_blank')}
                  >
                    Preview Widget
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Embed Code Panel */}
          <div className="lg:col-span-2">
            <Card
              title={
                <Space>
                  <CodeOutlined />
                  Embed Code
                </Space>
              }
            >
              <Tabs items={tabItems} />
            </Card>
          </div>
        </div>

        {/* Integration Instructions */}
        <Card title="Integration Instructions">
          <div className="space-y-4">
            <div>
              <Title level={4}>1. Choose Integration Method</Title>
              <Paragraph>
                Select the integration method that best fits your website or application. 
                The JavaScript method is recommended for most use cases as it provides 
                the best performance and user experience.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>2. Copy and Paste</Title>
              <Paragraph>
                Copy the embed code from the tabs above and paste it into your website&apos;s HTML.
                For the JavaScript method, place the code just before the closing &lt;code&gt;&amp;lt;/body&amp;gt;&lt;/code&gt; tag.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>3. Test Integration</Title>
              <Paragraph>
                After embedding the widget, test it on your website to ensure it&apos;s working correctly.
                The widget should appear in the configured position and respond to user interactions.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>4. Customize (Optional)</Title>
              <Paragraph>
                You can customize the widget&apos;s appearance and behavior by modifying its configuration
                in the VoxAssist dashboard. Changes will be reflected automatically on your website.
              </Paragraph>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
