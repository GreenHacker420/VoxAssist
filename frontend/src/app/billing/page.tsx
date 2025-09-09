'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { BillingService, Subscription, Invoice, BillingUsage, PaymentMethod } from '@/services/billing';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
  message,
  Modal,
  Progress
} from 'antd';
import {
  CreditCardOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  PhoneOutlined,
  MessageOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payment-methods'>('overview');

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [subData, invoicesData, usageData, paymentData] = await Promise.all([
        BillingService.getSubscription().catch(() => null),
        BillingService.getInvoices().catch(() => ({ invoices: [] })),
        BillingService.getUsage().catch(() => null),
        BillingService.getPaymentMethods().catch(() => [])
      ]);

      setSubscription(subData);
      setInvoices(invoicesData.invoices || []);
      setUsage(usageData);
      setPaymentMethods(paymentData);
    } catch (error) {
      console.error('Error loading subscription:', error);
      message.error('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    Modal.confirm({
      title: 'Cancel Subscription',
      content: 'Are you sure you want to cancel your subscription?',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No, Keep',
      onOk: async () => {
        try {
          await BillingService.cancelSubscription();
          message.success('Subscription cancelled successfully');
          loadBillingData();
        } catch {
          message.error('Failed to cancel subscription');
        }
      }
    });
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const blob = await BillingService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      message.error('Failed to download invoice');
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return <Tag color="success" icon={<CheckCircleOutlined />}>{status}</Tag>;
      case 'pending':
        return <Tag color="warning" icon={<ClockCircleOutlined />}>{status}</Tag>;
      case 'failed':
      case 'canceled':
        return <Tag color="error" icon={<ExclamationCircleOutlined />}>{status}</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Spin size="large" className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Title level={3}>Loading billing information...</Title>
          </div>
        </Spin>
      </DashboardLayout>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: renderOverviewTab(),
    },
    {
      key: 'invoices',
      label: 'Invoices',
      children: renderInvoicesTab(),
    },
    {
      key: 'payment-methods',
      label: 'Payment Methods',
      children: renderPaymentMethodsTab(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Title level={2}>Billing & Subscription</Title>
          <Text type="secondary">
            Manage your subscription, view invoices, and update payment methods
          </Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'overview' | 'invoices' | 'payment-methods')}
          items={tabItems}
        />
      </div>
    </DashboardLayout>
  );

  function renderOverviewTab() {
    return (
      <Space direction="vertical" size="large" className="w-full">
        {/* Current Subscription */}
        {subscription && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Title level={4}>Current Subscription</Title>
              {getStatusTag(subscription.status)}
            </div>

            <Row gutter={[24, 16]}>
              <Col xs={24} md={12}>
                <Statistic
                  title="Plan"
                  value={subscription.plan}
                  valueStyle={{ fontSize: '18px', fontWeight: 600 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Statistic
                  title="Price"
                  value={subscription.price}
                  prefix={<DollarOutlined />}
                  suffix="/month"
                  valueStyle={{ fontSize: '18px', fontWeight: 600 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary" className="block mb-1">Current Period</Text>
                  <Text strong>
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary" className="block mb-1">Auto-renewal</Text>
                  <Tag color={subscription.cancelAtPeriodEnd ? 'error' : 'success'}>
                    {subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}
                  </Tag>
                </div>
              </Col>
            </Row>

            <div className="mt-6">
              <Space>
                <Button type="primary" icon={<CreditCardOutlined />}>
                  Upgrade Plan
                </Button>
                {!subscription.cancelAtPeriodEnd && (
                  <Button
                    danger
                    onClick={handleCancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )}

        {/* Usage Statistics */}
        {usage && (
          <Card>
            <Title level={4} className="mb-4">Usage This Period</Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text strong><PhoneOutlined /> Calls</Text>
                    <Text>
                      {usage.callsUsed.toLocaleString()} / {usage.callsLimit.toLocaleString()}
                    </Text>
                  </div>
                  <Progress
                    percent={Math.min((usage.callsUsed / usage.callsLimit) * 100, 100)}
                    strokeColor="#1890ff"
                  />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text strong><MessageOutlined /> Storage</Text>
                    <Text>
                      {(usage.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB / {(usage.storageLimit / 1024 / 1024 / 1024).toFixed(0)} GB
                    </Text>
                  </div>
                  <Progress
                    percent={Math.min((usage.storageUsed / usage.storageLimit) * 100, 100)}
                    strokeColor="#52c41a"
                  />
                </div>
              </Col>
            </Row>
            <Alert
              message={`Period: ${formatDate(usage.period.start)} - ${formatDate(usage.period.end)}`}
              type="info"
              showIcon
              className="mt-4"
            />
          </Card>
        )}
      </Space>
    );
  }

  function renderInvoicesTab() {
    const invoiceColumns = [
      {
        title: 'Invoice',
        dataIndex: 'number',
        key: 'number',
        render: (number: string) => <Text strong>{number}</Text>,
      },
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        render: (date: string) => formatDate(date),
        sorter: (a: Invoice, b: Invoice) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount: number) => <Text strong>{formatCurrency(amount)}</Text>,
        sorter: (a: Invoice, b: Invoice) => a.amount - b.amount,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => getStatusTag(status),
        filters: [
          { text: 'Paid', value: 'paid' },
          { text: 'Pending', value: 'pending' },
          { text: 'Failed', value: 'failed' },
        ],
        onFilter: (value: boolean | React.Key, record: Invoice) => record.status === value,
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, record: Invoice) => (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadInvoice(record.id)}
          >
            Download
          </Button>
        ),
      },
    ];

    return (
      <Card>
        <Title level={4} className="mb-4">Invoices</Title>
        <Table
          columns={invoiceColumns}
          dataSource={invoices}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
          }}
        />
      </Card>
    );
  }

  function renderPaymentMethodsTab() {
    return (
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>Payment Methods</Title>
          <Button type="primary" icon={<CreditCardOutlined />}>
            Add Payment Method
          </Button>
        </div>

        <Space direction="vertical" size="middle" className="w-full">
          {paymentMethods.map((method) => (
            <Card key={method.id} size="small" className="border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCardOutlined className="text-2xl text-gray-400" />
                  <div>
                    <Text strong>
                      {method.brand?.toUpperCase()} ending in {method.last4}
                    </Text>
                    {method.expiryMonth && method.expiryYear && (
                      <div>
                        <Text type="secondary" className="text-sm">
                          Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault && (
                    <Tag color="success">Default</Tag>
                  )}
                  <Space>
                    {!method.isDefault && (
                      <Button size="small">Set as Default</Button>
                    )}
                    <Button size="small" danger>Remove</Button>
                  </Space>
                </div>
              </div>
            </Card>
          ))}

          {paymentMethods.length === 0 && (
            <Alert
              message="No payment methods"
              description="Add a payment method to manage your subscription."
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>
    );
  }
}
