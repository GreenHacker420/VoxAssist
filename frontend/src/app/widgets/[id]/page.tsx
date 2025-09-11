'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Tag,
  Statistic,
  Descriptions,
  Switch,
  Modal,
  message,
  Spin,
  Alert,
  Tabs,
  Badge,
  Tooltip,
  App
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  SettingOutlined,
  BarChartOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CopyOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { WidgetsService, type WidgetDTO, type WidgetAnalyticsDTO } from '@/services/widgets';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

function WidgetDetailsPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { message } = App.useApp();
  const widgetId = params.id as string;

  const [widget, setWidget] = useState<WidgetDTO | null>(null);
  const [analytics, setAnalytics] = useState<WidgetAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    if (widgetId) {
      loadWidget();
      loadAnalytics();
    }
  }, [widgetId]);

  const loadWidget = async () => {
    try {
      setLoading(true);
      const widgetData = await WidgetsService.get(widgetId);
      setWidget(widgetData);
    } catch (error) {
      console.error('Error loading widget:', error);
      setError('Failed to load widget details');
      message.error('Failed to load widget details');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const analyticsData = await WidgetsService.analytics(widgetId);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Don't show error for analytics as it's not critical
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      await WidgetsService.toggleActive(widgetId, isActive);
      setWidget(prev => prev ? { ...prev, isActive } : null);
      message.success(`Widget ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling widget status:', error);
      message.error('Failed to update widget status');
    }
  };

  const handleDelete = async () => {
    try {
      await WidgetsService.remove(widgetId);
      message.success('Widget deleted successfully');
      router.push('/widgets');
    } catch (error) {
      console.error('Error deleting widget:', error);
      message.error('Failed to delete widget');
    }
  };

  const copyEmbedCode = () => {
    const embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/embed/widget.js?id=${widgetId}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
    
    navigator.clipboard.writeText(embedCode);
    message.success('Embed code copied to clipboard');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !widget) {
    return (
      <DashboardLayout>
        <Alert
          message="Error"
          description={error || 'Widget not found'}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => router.push('/widgets')}>
              Back to Widgets
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <Title level={2} className="mb-2">
              {widget.name}
              <Badge 
                status={widget.isActive ? 'success' : 'default'} 
                text={widget.isActive ? 'Active' : 'Inactive'}
                className="ml-3"
              />
            </Title>
            <Text type="secondary">
              Created {new Date(widget.createdAt || '').toLocaleDateString()}
            </Text>
          </div>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => router.push(`/widgets/embed/${widgetId}`)}
            >
              Preview
            </Button>
            <Button
              icon={<CodeOutlined />}
              onClick={copyEmbedCode}
            >
              Copy Code
            </Button>
            <Button
              icon={<EditOutlined />}
              type="primary"
              onClick={() => router.push(`/widgets/${widgetId}/edit`)}
            >
              Edit
            </Button>
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={() => setDeleteModalVisible(true)}
            >
              Delete
            </Button>
          </Space>
        </div>

        {/* Quick Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Sessions"
                value={analytics?.totalSessions || 0}
                loading={analyticsLoading}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Interactions"
                value={analytics?.totalInteractions || 0}
                loading={analyticsLoading}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Avg Sentiment Score"
                value={analytics?.avgSentimentScore || 0}
                precision={2}
                loading={analyticsLoading}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Widget Details */}
        <Card>
          <Tabs defaultActiveKey="details">
            <TabPane tab="Details" key="details">
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Descriptions title="Basic Information" column={1} bordered>
                    <Descriptions.Item label="Name">{widget.name}</Descriptions.Item>
                    <Descriptions.Item label="Context URL">
                      {widget.contextUrl || 'Not specified'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Switch
                        checked={widget.isActive}
                        onChange={handleToggleActive}
                        checkedChildren={<PlayCircleOutlined />}
                        unCheckedChildren={<PauseCircleOutlined />}
                      />
                      <span className="ml-2">
                        {widget.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                      {new Date(widget.createdAt || '').toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Updated">
                      {new Date(widget.updatedAt || '').toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col xs={24} lg={12}>
                  <Descriptions title="Configuration" column={1} bordered>
                    <Descriptions.Item label="Position">
                      <Tag color="blue">{widget.appearance?.position}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Size">
                      <Tag color="green">{widget.appearance?.size}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Theme">
                      <Tag color="purple">{widget.appearance?.theme}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Auto Open">
                      <Tag color={widget.behavior?.autoOpen ? 'success' : 'default'}>
                        {widget.behavior?.autoOpen ? 'Enabled' : 'Disabled'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Voice Enabled">
                      <Tag color={widget.behavior?.enableVoice ? 'success' : 'default'}>
                        {widget.behavior?.enableVoice ? 'Yes' : 'No'}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="Appearance" key="appearance">
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Card title="Colors" size="small">
                    <Space direction="vertical" className="w-full">
                      <div className="flex items-center justify-between">
                        <Text>Primary Color:</Text>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: widget.appearance?.primaryColor }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Text>Secondary Color:</Text>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: widget.appearance?.secondaryColor }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Text>Text Color:</Text>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: widget.appearance?.textColor }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Text>Background Color:</Text>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: widget.appearance?.backgroundColor }}
                        />
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Layout" size="small">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Position">
                        {widget.appearance?.position}
                      </Descriptions.Item>
                      <Descriptions.Item label="Size">
                        {widget.appearance?.size}
                      </Descriptions.Item>
                      <Descriptions.Item label="Border Radius">
                        {widget.appearance?.borderRadius}
                      </Descriptions.Item>
                      <Descriptions.Item label="Theme">
                        {widget.appearance?.theme}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="Behavior" key="behavior">
              <Descriptions column={2} bordered>
                <Descriptions.Item label="Auto Open">
                  {widget.behavior?.autoOpen ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Auto Open Delay">
                  {widget.behavior?.autoOpenDelay || 0}ms
                </Descriptions.Item>
                <Descriptions.Item label="Greeting Message">
                  {widget.behavior?.greeting || 'Not set'}
                </Descriptions.Item>
                <Descriptions.Item label="Language">
                  {widget.behavior?.language || 'en'}
                </Descriptions.Item>
                <Descriptions.Item label="Voice Enabled">
                  {widget.behavior?.enableVoice ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Text Enabled">
                  {widget.behavior?.enableText ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="File Upload">
                  {widget.behavior?.enableFileUpload ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Show Branding">
                  {widget.behavior?.showBranding ? 'Yes' : 'No'}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
          </Tabs>
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal
          title="Delete Widget"
          open={deleteModalVisible}
          onOk={handleDelete}
          onCancel={() => setDeleteModalVisible(false)}
          okText="Delete"
          okType="danger"
        >
          <p>Are you sure you want to delete this widget? This action cannot be undone.</p>
          <p><strong>Widget:</strong> {widget.name}</p>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function WidgetDetailsPage() {
  return (
    <App>
      <WidgetDetailsPageContent />
    </App>
  );
}
