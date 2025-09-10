'use client';

import { Card, Typography, Tabs, Alert, Divider, Tag, Space } from 'antd';
import { 
  CodeOutlined, 
  GlobalOutlined, 
  SettingOutlined, 
  SecurityScanOutlined,
  ApiOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function WidgetDocsPage() {
  const tabItems = [
    {
      key: 'getting-started',
      label: (
        <Space>
          <CodeOutlined />
          Getting Started
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <Alert
            message="Quick Start Guide"
            description="Get your VoxAssist widget up and running in minutes with our simple integration process."
            type="info"
            showIcon
          />
          
          <div>
            <Title level={3}>1. Create Your Widget</Title>
            <Paragraph>
              First, create a new widget in your VoxAssist dashboard. Configure the appearance, 
              behavior, and permissions according to your needs.
            </Paragraph>
          </div>

          <div>
            <Title level={3}>2. Get Your Embed Code</Title>
            <Paragraph>
              Once your widget is created, you&apos;ll receive a unique embed code. This code contains
              your widget ID and all necessary configuration.
            </Paragraph>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              {`<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/embed/widget.js?id=YOUR_WIDGET_ID&v=1.0';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`}
            </div>
          </div>

          <div>
            <Title level={3}>3. Add to Your Website</Title>
            <Paragraph>
              Paste the embed code into your website&apos;s HTML, preferably just before the closing
              <code>&lt;/body&gt;</code> tag. The widget will automatically initialize when the page loads.
            </Paragraph>
          </div>

          <div>
            <Title level={3}>4. Test Integration</Title>
            <Paragraph>
              Visit your website to see the widget in action. It should appear in the configured 
              position and be ready to handle customer interactions.
            </Paragraph>
          </div>
        </div>
      )
    },
    {
      key: 'integration-methods',
      label: (
        <Space>
          <GlobalOutlined />
          Integration Methods
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <div>
            <Title level={3}>JavaScript Integration (Recommended)</Title>
            <Paragraph>
              The JavaScript method provides the best performance and user experience. 
              It loads asynchronously and doesn&apos;t block your page rendering.
            </Paragraph>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              {`<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://api.voxassist.com/embed/widget.js?id=YOUR_WIDGET_ID';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`}
            </div>
            <Alert
              message="Benefits"
              description="Automatic updates, better performance, cross-browser compatibility, and advanced features like auto-positioning."
              type="success"
            />
          </div>

          <Divider />

          <div>
            <Title level={3}>iFrame Integration</Title>
            <Paragraph>
              Use iFrame integration when you need more control over widget placement or 
              have restrictions on JavaScript execution.
            </Paragraph>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              {`<iframe 
  src="https://api.voxassist.com/embed/widget/YOUR_WIDGET_ID/iframe"
  width="350" 
  height="500"
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; z-index: 999999;">
</iframe>`}
            </div>
            <Alert
              message="Use Cases"
              description="Content management systems, restricted environments, or when you need precise control over widget positioning."
              type="info"
            />
          </div>

          <Divider />

          <div>
            <Title level={3}>React Integration</Title>
            <Paragraph>
              For React applications, use our React component for better lifecycle management.
            </Paragraph>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              {`import { useEffect } from 'react';

export function VoxAssistWidget({ widgetId }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = \`https://api.voxassist.com/embed/widget.js?id=\${widgetId}\`;
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      const widget = document.getElementById('voxassist-widget-container');
      if (widget) widget.remove();
    };
  }, [widgetId]);

  return null;
}`}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'customization',
      label: (
        <Space>
          <SettingOutlined />
          Customization
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <div>
            <Title level={3}>Appearance Options</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card size="small" title="Position">
                <ul className="space-y-1 text-sm">
                  <li><Tag color="blue">bottom-right</Tag> Default position</li>
                  <li><Tag color="green">bottom-left</Tag> Left corner</li>
                  <li><Tag color="orange">top-right</Tag> Top right</li>
                  <li><Tag color="purple">top-left</Tag> Top left</li>
                </ul>
              </Card>
              <Card size="small" title="Size">
                <ul className="space-y-1 text-sm">
                  <li><Tag>small</Tag> 300x400px</li>
                  <li><Tag>medium</Tag> 350x500px (default)</li>
                  <li><Tag>large</Tag> 400x600px</li>
                </ul>
              </Card>
            </div>
          </div>

          <div>
            <Title level={3}>Color Customization</Title>
            <Paragraph>
              Customize your widget colors to match your brand. All colors support hex, RGB, 
              and HSL formats.
            </Paragraph>
            <ul className="space-y-2">
              <li><strong>Primary Color:</strong> Main widget theme color</li>
              <li><strong>Secondary Color:</strong> Accent and hover states</li>
              <li><strong>Text Color:</strong> Primary text color</li>
              <li><strong>Background Color:</strong> Widget background</li>
            </ul>
          </div>

          <div>
            <Title level={3}>Behavior Settings</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card size="small" title="Auto-open">
                <Text>Automatically open the widget after a specified delay</Text>
              </Card>
              <Card size="small" title="Greeting Message">
                <Text>Customize the initial message shown to users</Text>
              </Card>
              <Card size="small" title="Language">
                <Text>Set the widget language (supports 10+ languages)</Text>
              </Card>
              <Card size="small" title="Features">
                <Text>Enable/disable text chat, voice chat, and audio recording</Text>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'security',
      label: (
        <Space>
          <SecurityScanOutlined />
          Security & Privacy
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <Alert
            message="Privacy First"
            description="VoxAssist widgets are designed with privacy and security as top priorities. All data is encrypted and handled according to GDPR and other privacy regulations."
            type="success"
            showIcon
          />

          <div>
            <Title level={3}>Domain Restrictions</Title>
            <Paragraph>
              Configure which domains can embed your widget to prevent unauthorized usage.
            </Paragraph>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text code>Allowed domains: example.com, *.example.com, subdomain.example.com</Text>
            </div>
          </div>

          <div>
            <Title level={3}>Data Collection Settings</Title>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text strong>Personal Data Collection</Text>
                  <br />
                  <Text type="secondary" className="text-sm">Collect names, emails, and other personal information</Text>
                </div>
                <Tag color="orange">Optional</Tag>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text strong>Cookie Storage</Text>
                  <br />
                  <Text type="secondary" className="text-sm">Store session data and preferences</Text>
                </div>
                <Tag color="green">Recommended</Tag>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text strong>Audio Recording</Text>
                  <br />
                  <Text type="secondary" className="text-sm">Record voice messages for transcription</Text>
                </div>
                <Tag color="red">Requires Consent</Tag>
              </div>
            </div>
          </div>

          <div>
            <Title level={3}>GDPR Compliance</Title>
            <Paragraph>
              VoxAssist widgets automatically handle GDPR compliance when configured properly:
            </Paragraph>
            <ul className="space-y-1">
              <li>✅ Consent management for data collection</li>
              <li>✅ Right to data deletion</li>
              <li>✅ Data portability</li>
              <li>✅ Transparent privacy policies</li>
              <li>✅ Secure data encryption</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      key: 'api',
      label: (
        <Space>
          <ApiOutlined />
          API Reference
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <div>
            <Title level={3}>Widget JavaScript API</Title>
            <Paragraph>
              Once embedded, the widget exposes a global API for programmatic control.
            </Paragraph>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              {`// Open the widget
window.VoxAssistWidget.open();

// Close the widget
window.VoxAssistWidget.close();

// Toggle widget visibility
window.VoxAssistWidget.toggle();

// Get widget state
const state = window.VoxAssistWidget.getState();
console.log(state.isOpen, state.sessionId);

// Listen to widget events
window.VoxAssistWidget.on('open', () => {
  console.log('Widget opened');
});

window.VoxAssistWidget.on('message', (data) => {
  console.log('New message:', data);
});`}
            </div>
          </div>

          <div>
            <Title level={3}>REST API Endpoints</Title>
            <div className="space-y-4">
              <Card size="small">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>GET /embed/widget/:id/config</Text>
                  <Tag color="blue">GET</Tag>
                </div>
                <Text type="secondary">Retrieve widget configuration</Text>
              </Card>
              
              <Card size="small">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>POST /embed/widget/:id/session</Text>
                  <Tag color="green">POST</Tag>
                </div>
                <Text type="secondary">Initialize a new widget session</Text>
              </Card>
              
              <Card size="small">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>POST /embed/widget/:id/message</Text>
                  <Tag color="green">POST</Tag>
                </div>
                <Text type="secondary">Send a message to the widget</Text>
              </Card>
            </div>
          </div>

          <div>
            <Title level={3}>Webhook Events</Title>
            <Paragraph>
              Configure webhooks to receive real-time notifications about widget interactions.
            </Paragraph>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text code>widget.session.started</Text> - New session initiated
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text code>widget.message.received</Text> - User sent a message
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text code>widget.session.ended</Text> - Session completed
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'troubleshooting',
      label: (
        <Space>
          <BugOutlined />
          Troubleshooting
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <div>
            <Title level={3}>Common Issues</Title>
            
            <Card className="mb-4">
              <Title level={4}>Widget Not Appearing</Title>
              <ul className="space-y-1">
                <li>✓ Check that the widget ID is correct</li>
                <li>✓ Verify the embed code is placed before <code>&lt;/body&gt;</code></li>
                <li>✓ Ensure the widget is active in your dashboard</li>
                <li>✓ Check browser console for JavaScript errors</li>
              </ul>
            </Card>

            <Card className="mb-4">
              <Title level={4}>Widget Not Responding</Title>
              <ul className="space-y-1">
                <li>✓ Check your internet connection</li>
                <li>✓ Verify API endpoints are accessible</li>
                <li>✓ Check for CORS issues in browser console</li>
                <li>✓ Ensure domain is whitelisted if restrictions are enabled</li>
              </ul>
            </Card>

            <Card className="mb-4">
              <Title level={4}>Styling Issues</Title>
              <ul className="space-y-1">
                <li>✓ Check for CSS conflicts with your website</li>
                <li>✓ Verify z-index values (widget uses 999999)</li>
                <li>✓ Test on different screen sizes</li>
                <li>✓ Clear browser cache and reload</li>
              </ul>
            </Card>
          </div>

          <div>
            <Title level={3}>Debug Mode</Title>
            <Paragraph>
              Enable debug mode by adding <code>?debug=true</code> to your widget URL:
            </Paragraph>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              {`script.src = 'https://api.voxassist.com/embed/widget.js?id=YOUR_WIDGET_ID&debug=true';`}
            </div>
            <Paragraph>
              This will enable console logging and additional debugging information.
            </Paragraph>
          </div>

          <div>
            <Title level={3}>Browser Compatibility</Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Text strong className="text-green-700">Chrome</Text>
                <br />
                <Text className="text-sm">60+</Text>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Text strong className="text-green-700">Firefox</Text>
                <br />
                <Text className="text-sm">55+</Text>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Text strong className="text-green-700">Safari</Text>
                <br />
                <Text className="text-sm">12+</Text>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Text strong className="text-green-700">Edge</Text>
                <br />
                <Text className="text-sm">79+</Text>
              </div>
            </div>
          </div>

          <Alert
            message="Need Help?"
            description="If you're still experiencing issues, contact our support team with your widget ID and a description of the problem."
            type="info"
            showIcon
          />
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Title level={1}>Widget Integration Documentation</Title>
          <Paragraph className="text-lg text-gray-600">
            Complete guide to integrating VoxAssist widgets into your website or application.
          </Paragraph>
        </div>

        <Card>
          <Tabs items={tabItems} />
        </Card>
      </div>
    </div>
  );
}
