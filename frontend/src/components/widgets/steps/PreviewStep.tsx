'use client';

import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Tabs,
  Alert,
  Tag,
  Divider,
  message,
  Input
} from 'antd';
import { 
  CheckCircleOutlined, 
  CopyOutlined, 
  EyeOutlined,
  CodeOutlined,
  SettingOutlined,
  GlobalOutlined,
  DownloadOutlined,
  ShareAltOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface WidgetAppearance {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  borderRadius: string;
  size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
}

interface WidgetBehavior {
  autoOpen: boolean;
  autoOpenDelay: number;
  greeting: string;
  language: string;
  enableVoice: boolean;
  enableText: boolean;
  enableFileUpload: boolean;
  showBranding: boolean;
}

interface WidgetPermissions {
  collectPersonalData: boolean;
  storeCookies: boolean;
  recordAudio: boolean;
  shareWithThirdParty: boolean;
  allowedDomains: string[];
}

interface WidgetConfig {
  name: string;
  contextUrl: string;
  appearance: WidgetAppearance;
  behavior: WidgetBehavior;
  permissions: WidgetPermissions;
}

interface PreviewStepProps {
  formData: WidgetConfig;
}

export default function PreviewStep({ formData }: PreviewStepProps) {
  const [activeTab, setActiveTab] = useState('javascript');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
  const widgetId = 'preview-widget-' + Date.now();

  const generateEmbedCode = (format: string) => {
    switch (format) {
      case 'javascript':
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
        return `<!-- VoxAssist Widget (iFrame) -->
<iframe 
  src="${baseUrl}/embed/iframe/${widgetId}" 
  width="350" 
  height="500" 
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
</iframe>`;

      case 'react':
        return `// React Component
import { useEffect } from 'react';

export default function VoxAssistWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widgetId}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null; // Widget renders itself
}`;

      case 'wordpress':
        return `<?php
// Add to your theme's functions.php file
function add_voxassist_widget() {
    ?>
    <script>
      (function() {
        var script = document.createElement('script');
        script.src = '${baseUrl}/embed/widget.js?id=${widgetId}&v=1.0';
        script.async = true;
        document.head.appendChild(script);
      })();
    </script>
    <?php
}
add_action('wp_footer', 'add_voxassist_widget');
?>`;

      default:
        return '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Code copied to clipboard!');
    });
  };

  const getConfigSummary = () => {
    const { appearance, behavior, permissions } = formData;
    return {
      appearance: [
        `Position: ${appearance.position}`,
        `Theme: ${appearance.theme}`,
        `Size: ${appearance.size}`,
        `Primary Color: ${appearance.primaryColor}`
      ],
      behavior: [
        `Auto-open: ${behavior.autoOpen ? 'Yes' : 'No'}`,
        `Voice: ${behavior.enableVoice ? 'Enabled' : 'Disabled'}`,
        `Text: ${behavior.enableText ? 'Enabled' : 'Disabled'}`,
        `Language: ${behavior.language.toUpperCase()}`
      ],
      permissions: [
        `Personal Data: ${permissions.collectPersonalData ? 'Allowed' : 'Restricted'}`,
        `Audio Recording: ${permissions.recordAudio ? 'Allowed' : 'Restricted'}`,
        `Domain Restrictions: ${permissions.allowedDomains.length > 0 ? `${permissions.allowedDomains.length} domains` : 'None'}`,
        `Third-party Sharing: ${permissions.shareWithThirdParty ? 'Allowed' : 'Restricted'}`
      ]
    };
  };

  const config = getConfigSummary();

  const embedTabs = [
    {
      key: 'javascript',
      label: (
        <Space>
          <CodeOutlined />
          JavaScript
        </Space>
      ),
      children: (
        <div>
          <div className="flex justify-between items-center mb-3">
            <Text strong>Standard JavaScript Embed</Text>
            <Button 
              type="primary" 
              size="small" 
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(generateEmbedCode('javascript'))}
            >
              Copy Code
            </Button>
          </div>
          <TextArea
            value={generateEmbedCode('javascript')}
            rows={8}
            readOnly
            className="font-mono text-sm"
          />
          <Text type="secondary" className="text-xs mt-2 block">
            Recommended for most websites. Paste this code before the closing &lt;/body&gt; tag.
          </Text>
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
        <div>
          <div className="flex justify-between items-center mb-3">
            <Text strong>iFrame Embed</Text>
            <Button 
              type="primary" 
              size="small" 
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(generateEmbedCode('iframe'))}
            >
              Copy Code
            </Button>
          </div>
          <TextArea
            value={generateEmbedCode('iframe')}
            rows={8}
            readOnly
            className="font-mono text-sm"
          />
          <Text type="secondary" className="text-xs mt-2 block">
            Use when you need more control over positioning or have strict security policies.
          </Text>
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
        <div>
          <div className="flex justify-between items-center mb-3">
            <Text strong>React Component</Text>
            <Button 
              type="primary" 
              size="small" 
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(generateEmbedCode('react'))}
            >
              Copy Code
            </Button>
          </div>
          <TextArea
            value={generateEmbedCode('react')}
            rows={12}
            readOnly
            className="font-mono text-sm"
          />
          <Text type="secondary" className="text-xs mt-2 block">
            For React applications. Import and use this component in your app.
          </Text>
        </div>
      )
    },
    {
      key: 'wordpress',
      label: (
        <Space>
          <SettingOutlined />
          WordPress
        </Space>
      ),
      children: (
        <div>
          <div className="flex justify-between items-center mb-3">
            <Text strong>WordPress Integration</Text>
            <Button 
              type="primary" 
              size="small" 
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(generateEmbedCode('wordpress'))}
            >
              Copy Code
            </Button>
          </div>
          <TextArea
            value={generateEmbedCode('wordpress')}
            rows={10}
            readOnly
            className="font-mono text-sm"
          />
          <Text type="secondary" className="text-xs mt-2 block">
            Add this code to your WordPress theme's functions.php file.
          </Text>
        </div>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <Title level={3} className="!mb-3 !text-gray-900">
          <CheckCircleOutlined className="text-green-500 mr-2" />
          Your widget is ready!
        </Title>
        <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
          Review your configuration and get the embed code to start using your widget
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* Configuration Summary */}
        <Col xs={24} lg={10}>
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <Title level={4} className="!mb-4 !text-gray-900">
              <SettingOutlined className="mr-2 text-blue-500" />
              Configuration Summary
            </Title>
            
            <div className="space-y-4">
              <div>
                <Text strong className="text-green-600">Widget Name</Text>
                <div className="mt-1">
                  <Tag color="blue" className="text-sm">{formData.name}</Tag>
                </div>
              </div>

              <Divider />

              <div>
                <Text strong className="text-purple-600">Appearance</Text>
                <div className="mt-2 space-y-1">
                  {config.appearance.map((item, index) => (
                    <Text key={index} type="secondary" className="block text-sm">
                      • {item}
                    </Text>
                  ))}
                </div>
              </div>

              <Divider />

              <div>
                <Text strong className="text-orange-600">Behavior</Text>
                <div className="mt-2 space-y-1">
                  {config.behavior.map((item, index) => (
                    <Text key={index} type="secondary" className="block text-sm">
                      • {item}
                    </Text>
                  ))}
                </div>
              </div>

              <Divider />

              <div>
                <Text strong className="text-red-600">Privacy & Security</Text>
                <div className="mt-2 space-y-1">
                  {config.permissions.map((item, index) => (
                    <Text key={index} type="secondary" className="block text-sm">
                      • {item}
                    </Text>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <Title level={5} className="!mb-3">Quick Actions</Title>
            <Space direction="vertical" className="w-full">
              <Button 
                type="primary" 
                icon={<EyeOutlined />} 
                block
                onClick={() => window.open(`${baseUrl}/widget-test.html`, '_blank')}
              >
                Your widget's ready to go live!
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                block
              >
                Download Integration Guide
              </Button>
              <Button 
                icon={<ShareAltOutlined />} 
                block
              >
                Share Configuration
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Embed Code */}
        <Col xs={24} lg={14}>
          <Card>
            <Title level={4} className="!mb-4">
              <CodeOutlined className="mr-2 text-green-500" />
              Embed Code
            </Title>
            
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              items={embedTabs}
            />
          </Card>

          {/* Installation Instructions */}
          <Card className="mt-6">
            <Title level={5} className="!mb-3">
              <GlobalOutlined className="mr-2" />
              Installation Instructions
            </Title>
            
            <div className="space-y-3">
              <Alert
                message="Step 1: Copy the embed code"
                description="Choose the format that best fits your website platform and copy the code above."
                type="info"
                showIcon
              />
              <Alert
                message="Step 2: Paste into your website"
                description="Add the code to your website's HTML, preferably before the closing </body> tag."
                type="success"
                showIcon
              />
              <Alert
                message="Step 3: Test the integration"
                description="Visit your website to ensure the widget appears and functions correctly."
                type="warning"
                showIcon
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
