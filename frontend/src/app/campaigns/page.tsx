'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Campaign } from '@/types';
import { formatDate, formatPercentage } from '@/lib/utils';
import {
  Card,
  Button,
  Typography,
  Tag,
  Progress,
  Space,
  Row,
  Col,
  Spin,
  Alert,
  Empty
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  EyeOutlined,
  EditOutlined,
  SoundOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for campaigns
    const mockCampaigns: Campaign[] = [
      {
        id: 1,
        name: 'Q1 Customer Outreach',
        description: 'Quarterly customer satisfaction and upselling campaign',
        status: 'active',
        startDate: '2023-12-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z',
        targetCount: 1000,
        completedCount: 650,
        successRate: 23.5,
        createdAt: '2023-11-15T10:00:00Z',
      },
      {
        id: 2,
        name: 'Holiday Promotion',
        description: 'Special holiday offers and promotions campaign',
        status: 'paused',
        startDate: '2023-12-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
        targetCount: 500,
        completedCount: 125,
        successRate: 18.2,
        createdAt: '2023-12-01T14:30:00Z',
      },
      {
        id: 3,
        name: 'Lead Qualification',
        description: 'Qualifying new leads from website and referrals',
        status: 'draft',
        targetCount: 200,
        completedCount: 0,
        createdAt: '2023-12-05T09:15:00Z',
      },
    ];
    
    setCampaigns(mockCampaigns);
    setIsLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'processing';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return PlayCircleOutlined;
      case 'paused':
        return PauseCircleOutlined;
      case 'completed':
        return StopOutlined;
      default:
        return EditOutlined;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-64">
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Title level={2} className="!mb-2">Campaigns</Title>
            <Paragraph className="!mb-0 text-gray-600">
              Create and manage voice calling campaigns for outreach and lead generation.
            </Paragraph>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
          >
            New Campaign
          </Button>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            className="mb-6"
          />
        )}

        {/* Campaigns grid */}
        <Row gutter={[24, 24]}>
          {campaigns.length === 0 ? (
            <Col span={24}>
              <Empty
                image={<SoundOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                description={
                  <div>
                    <Text strong>No campaigns</Text>
                    <br />
                    <Text type="secondary">Get started by creating your first campaign.</Text>
                  </div>
                }
              >
                <Button type="primary" icon={<PlusOutlined />}>
                  New Campaign
                </Button>
              </Empty>
            </Col>
          ) : (
            campaigns.map((campaign) => {
              const StatusIcon = getStatusIcon(campaign.status);
              const progress = campaign.targetCount ? (campaign.completedCount / campaign.targetCount) * 100 : 0;

              return (
                <Col key={campaign.id} xs={24} lg={12} xl={8}>
                  <Card
                    className="h-full"
                    title={
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <StatusIcon className="mr-2" />
                          <Text strong>{campaign.name}</Text>
                        </div>
                        <Tag color={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Tag>
                      </div>
                    }
                  >

                    <Space direction="vertical" size="middle" className="w-full">
                      {campaign.description && (
                        <Paragraph className="!mb-0" type="secondary">
                          {campaign.description}
                        </Paragraph>
                      )}

                      {/* Progress */}
                      {campaign.targetCount && (
                        <div>
                          <div className="flex justify-between mb-2">
                            <Text strong>Progress</Text>
                            <Text>{campaign.completedCount} / {campaign.targetCount}</Text>
                          </div>
                          <Progress
                            percent={Math.min(progress, 100)}
                            strokeColor="#3b82f6"
                            showInfo={false}
                          />
                          <div className="flex justify-between mt-1">
                            <Text type="secondary" className="text-sm">
                              {formatPercentage(progress, 0)} complete
                            </Text>
                            {campaign.successRate && (
                              <Text type="secondary" className="text-sm">
                                {formatPercentage(campaign.successRate)} success rate
                              </Text>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      <div>
                        {campaign.startDate && (
                          <div className="flex justify-between mb-1">
                            <Text type="secondary">Start Date:</Text>
                            <Text>{formatDate(campaign.startDate)}</Text>
                          </div>
                        )}
                        {campaign.endDate && (
                          <div className="flex justify-between mb-1">
                            <Text type="secondary">End Date:</Text>
                            <Text>{formatDate(campaign.endDate)}</Text>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <Text type="secondary">Created:</Text>
                          <Text>{formatDate(campaign.createdAt)}</Text>
                        </div>
                      </div>

                      {/* Actions */}
                      <Space.Compact block>
                        {campaign.status === 'draft' && (
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            className="flex-1"
                          >
                            Start
                          </Button>
                        )}
                        {campaign.status === 'active' && (
                          <Button
                            type="primary"
                            danger
                            icon={<PauseCircleOutlined />}
                            className="flex-1"
                          >
                            Pause
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            className="flex-1"
                          >
                            Resume
                          </Button>
                        )}
                        <Button
                          icon={<EyeOutlined />}
                          className="flex-1"
                        >
                          View
                        </Button>
                        <Button
                          icon={<EditOutlined />}
                        />
                      </Space.Compact>
                    </Space>
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      </div>
    </DashboardLayout>
  );
}
