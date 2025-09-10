'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Tag,
  Statistic,
  Input,
  Select,
  Empty,
  Spin,
  Dropdown,
  App,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  BarChartOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  MoreOutlined,
  EyeOutlined,
  CodeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { DEMO_WIDGETS, DemoWidget } from '@/demo/widgets';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetsService, type WidgetDTO } from '@/services/widgets';
import WidgetCreationWizard from './WidgetCreationWizard';
import DemoCallInterface from '@/components/DemoCall/DemoCallInterface';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface WidgetsDashboardProps {
  onCreateWidget?: () => void;
}

export default function WidgetsDashboard({ onCreateWidget }: WidgetsDashboardProps) {
  const router = useRouter();
  const { user, isDemoMode } = useAuth();
  const { message } = App.useApp();
  const [widgets, setWidgets] = useState<WidgetDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetDTO | null>(null);

  // Convert demo widgets to WidgetDTO format
  const convertDemoWidgets = (demoWidgets: DemoWidget[]): WidgetDTO[] => {
    return demoWidgets.map(widget => ({
      id: widget.id,
      name: widget.name,
      contextUrl: `https://example.com/${widget.id}`, // Demo URL
      organizationId: 1,
      isActive: widget.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appearance: {
        position: 'bottom-right',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        textColor: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        size: 'medium',
        theme: 'light'
      },
      behavior: {
        autoOpen: false,
        autoOpenDelay: 5000,
        greeting: 'Hi! How can I help you today?',
        language: 'en',
        enableVoice: true,
        enableText: true,
        enableFileUpload: true,
        showBranding: true
      },
      permissions: {
        collectPersonalData: false,
        storeCookies: true,
        recordAudio: false,
        shareWithThirdParty: false,
        allowedDomains: []
      }
    }));
  };

  // Load widgets (demo data or real API call)
  useEffect(() => {
    const loadWidgets = async () => {
      setIsLoading(true);
      try {
        if (isDemoMode) {
          // Use demo data converted to WidgetDTO format
          setWidgets(convertDemoWidgets(DEMO_WIDGETS));
        } else if (user?.organizationId) {
          const response = await WidgetsService.list(user.organizationId);
          setWidgets(response);
        } else {
          setWidgets([]);
        }
      } catch (error) {
        console.error('Failed to load widgets:', error);
        message.error('Failed to load widgets');
      } finally {
        setIsLoading(false);
      }
    };

    loadWidgets();
  }, [isDemoMode, user?.organizationId]);

  // Handler functions
  const handleCreateWidget = () => {
    setEditingWidget(null);
    setShowCreateWizard(true);
  };

  const handleEditWidget = (widget: WidgetDTO) => {
    setEditingWidget(widget);
    setShowCreateWizard(true);
  };

  const handleWizardSuccess = (widget: WidgetDTO) => {
    if (editingWidget) {
      setWidgets(prev => prev.map(w => w.id === widget.id ? widget : w));
      message.success('Widget updated successfully');
    } else {
      setWidgets(prev => [...prev, widget]);
      message.success('Widget created successfully');
    }
    setShowCreateWizard(false);
    setEditingWidget(null);
  };

  // Filter widgets based on search and status
  const filteredWidgets = widgets.filter(widget => {
    const contextUrl = 'contextUrl' in widget ? widget.contextUrl : undefined;
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contextUrl?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && widget.isActive) ||
                         (statusFilter === 'inactive' && !widget.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = (widgetId: string, isActive: boolean) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === widgetId ? { ...widget, isActive } : widget
      )
    );
  };

  const handleDeleteWidget = async (widgetId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this widget? This action cannot be undone.');
    if (!confirmed) return;

    try {
      if (isDemoMode) {
        // Demo mode - just remove from local state
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
        message.success('Widget deleted successfully (demo mode)');
      } else {
        // Real mode - call API
        await WidgetsService.remove(widgetId);
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
        message.success('Widget deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete widget:', error);
      message.error('Failed to delete widget');
    }
  };

  const getStatusTag = (isActive: boolean) => {
    return (
      <Tag color={isActive ? 'success' : 'warning'} icon={<CheckCircleOutlined />}>
        {isActive ? 'Active' : 'Inactive'}
      </Tag>
    );
  };

  const getWidgetActions = (widget: WidgetDTO) => ({
    items: [
      {
        key: 'view',
        label: 'View Details',
        icon: <EyeOutlined />,
        onClick: () => router.push(`/widgets/${widget.id}`)
      },
      {
        key: 'embed',
        label: 'Get Embed Code',
        icon: <CodeOutlined />,
        onClick: () => router.push(`/widgets/embed/${widget.id}`)
      },
      {
        key: 'edit',
        label: 'Edit Widget',
        icon: <EditOutlined />,
        onClick: () => handleEditWidget(widget)
      },
      {
        key: 'delete',
        label: 'Delete Widget',
        icon: <DeleteOutlined />,
        onClick: () => widget.id && handleDeleteWidget(widget.id),
        danger: true
      }
    ]
  });

  if (!user?.organizationId && !isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Title level={2}>Authentication Required</Title>
          <Paragraph className="text-lg text-gray-600 mb-6">
            Please log in to manage your widgets.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'widgets',
      label: (
        <span>
          <GlobalOutlined />
          Widget Management
        </span>
      ),
      children: (
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
              <Title level={2} className="!mb-2 !text-gray-900">
                Widget Management
                {isDemoMode && (
                  <Tag color="blue" className="ml-3">Demo Mode</Tag>
                )}
              </Title>
              <Paragraph className="text-lg text-gray-600">
                Create, manage, and deploy your communication widgets
              </Paragraph>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleCreateWidget}
              className="shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Create Widget
            </Button>
          </div>

          {/* Stats Cards */}
          <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} sm={8}>
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title="Total Widgets"
                  value={widgets.length}
                  prefix={<GlobalOutlined className="text-blue-500" />}
                  valueStyle={{ color: '#3B82F6' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title="Active Widgets"
                  value={widgets.filter(w => w.isActive).length}
                  prefix={<CheckCircleOutlined className="text-green-500" />}
                  valueStyle={{ color: '#10B981' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title="Total Interactions"
                  value={isDemoMode ? 2847 : 0}
                  prefix={<BarChartOutlined className="text-purple-500" />}
                  valueStyle={{ color: '#8B5CF6' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} lg={8}>
              <Search
                placeholder="Search widgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full"
                prefix={<FilterOutlined />}
              >
                <Option value="all">All Status</Option>
                <Option value="active">Active Only</Option>
                <Option value="inactive">Inactive Only</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Widgets Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : filteredWidgets.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg">
            <Empty
              description={
                <div>
                  <Title level={4} className="!text-gray-500">No widgets found</Title>
                  <Text type="secondary">
                    {widgets.length === 0
                      ? "Get started by creating your first widget"
                      : "Try adjusting your search or filter criteria"
                    }
                  </Text>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {widgets.length === 0 && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateWidget}>
                  Create Your First Widget
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {filteredWidgets.map((widget) => (
              <Col xs={24} lg={12} xl={8} key={widget.id}>
                <Card
                  className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 h-full"
                  actions={[
                    <Button
                      key="view"
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => router.push(`/widgets/${widget.id}`)}
                    >
                      View
                    </Button>,
                    <Button
                      key="embed"
                      type="text"
                      icon={<CodeOutlined />}
                      onClick={() => router.push(`/widgets/embed/${widget.id}`)}
                    >
                      Embed
                    </Button>,
                    <Dropdown
                      key="more"
                      menu={getWidgetActions(widget)}
                      trigger={['click']}
                    >
                      <Button type="text" icon={<MoreOutlined />}>
                        More
                      </Button>
                    </Dropdown>
                  ]}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Title level={4} className="!mb-0 !text-gray-900">
                        {widget.name}
                      </Title>
                      {getStatusTag(widget.isActive ?? false)}
                    </div>
                    <Text type="secondary" className="text-sm">
                      {'contextUrl' in widget ? widget.contextUrl || 'No URL specified' : 'Demo Widget'}
                    </Text>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Text className="text-sm text-gray-600">Position:</Text>
                      <Tag>
                        {'appearance' in widget
                          ? widget.appearance?.position
                          : (widget as DemoWidget).configuration?.position
                        }
                      </Tag>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text className="text-sm text-gray-600">Theme:</Text>
                      <Tag>
                        {'appearance' in widget
                          ? widget.appearance?.theme
                          : (widget as DemoWidget).configuration?.theme
                        }
                      </Tag>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text className="text-sm text-gray-600">Status:</Text>
                      <Tag color={widget.isActive ? 'success' : 'default'}>
                        {widget.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text className="text-sm text-gray-600">Created:</Text>
                      <Text className="text-sm text-gray-500">
                        {new Date(widget.createdAt!).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

          {/* Widget Creation Wizard */}
          <WidgetCreationWizard
            open={showCreateWizard}
            onClose={() => {
              setShowCreateWizard(false);
              setEditingWidget(null);
            }}
            onSuccess={handleWizardSuccess}
            editWidget={editingWidget}
          />
        </div>
      )
    },
    {
      key: 'demo-call',
      label: (
        <span>
          <ExperimentOutlined />
          Demo Call
        </span>
      ),
      children: (
        <div>
          <div className="mb-6">
            <Title level={3}>Test VoxAssist Features</Title>
            <Text type="secondary">
              Experience VoxAssist&apos;s calling capabilities with real-time transcript and sentiment analysis
            </Text>
          </div>
          <DemoCallInterface />
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Title level={2}>VoxAssist Dashboard</Title>
          <Text type="secondary">
            Manage your voice widgets and test calling features
          </Text>
        </div>

        <Tabs
          defaultActiveKey="widgets"
          items={tabItems}
          size="large"
          className="bg-white rounded-lg shadow-sm"
        />
      </div>
    </div>
  );
}
