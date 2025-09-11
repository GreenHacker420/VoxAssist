'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, Typography, Button, Space, Tabs, Alert, Input, Switch, Divider, Tag } from 'antd';
import { CopyOutlined, CodeOutlined, GlobalOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { WidgetsService } from '@/services/widgets';
import type { WidgetDTO } from '@/services/widgets';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import WidgetPreview from '@/components/widgets/WidgetPreview';

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
      const widgetData = await WidgetsService.get(widgetId);
      setWidget(widgetData);
    } catch (error) {
      console.error('Error loading widget:', error);
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
    const domain = customDomain || 'your-domain.com';
    return WidgetsService.generateEmbedCode(widgetId, type, domain);
  };

  const getTestUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}/embed/widget/${widgetId}/iframe?test=true`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading widget configuration...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!widget) {
    return (
      <DashboardLayout>
        <Alert
          message="Widget Not Found"
          description="The requested widget could not be found or you don't have permission to access it."
          type="error"
          showIcon
        />
      </DashboardLayout>
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
    <DashboardLayout>
      <div className="space-y-6">
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

        {/* Live Preview */}
        <Card title="Live Preview">
          <div className="space-y-4">
            <Alert
              message="Interactive Preview"
              description="This is a live preview of how your widget will appear and behave on your website. Click the widget button to test the interaction."
              type="info"
              showIcon
            />
            <div className="relative bg-gray-100 rounded-lg p-8 min-h-[400px]">
              <div className="text-center text-gray-500 mb-4">
                <Text>Your website content would appear here</Text>
              </div>
              <WidgetPreview widget={widget} />
            </div>
          </div>
        </Card>

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
    </DashboardLayout>
  );
}
