'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Customer, Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Table,
  Button,
  Input,
  Typography,
  Tag,
  Space,
  Avatar,
  Spin,
  Alert,
  Empty,
  Modal,
  Form,
  Select,
  App
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

export default function ContactsPage() {
  const { message } = App.useApp();
  const [contacts, setContacts] = useState<(Customer | Lead)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(3);

  useEffect(() => {
    // Mock data for now since we don't have a contacts endpoint
    const mockContacts: Lead[] = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        company: 'Acme Corp',
        source: 'Website',
        status: 'new',
        createdAt: '2023-12-01T10:00:00Z',
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@techco.com',
        phone: '+1 (555) 987-6543',
        company: 'TechCo',
        source: 'Referral',
        status: 'contacted',
        createdAt: '2023-12-02T14:30:00Z',
      },
    ];
    
    setContacts(mockContacts);
    setIsLoading(false);
  }, []);

  const handleAddContact = async (values: any) => {
    try {
      const newContact: Lead = {
        id: nextId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company || '',
        source: values.source || 'Manual',
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      setContacts(prev => [newContact, ...prev]);
      setNextId(prev => prev + 1);
      setShowAddModal(false);
      form.resetFields();
      message.success('Contact added successfully!');
    } catch (error) {
      message.error('Failed to add contact');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'processing';
      case 'contacted':
        return 'warning';
      case 'qualified':
        return 'success';
      case 'converted':
        return 'purple';
      default:
        return 'default';
    }
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Customer | Lead) => (
        <div className="flex items-center space-x-3">
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.firstName} {record.lastName}</Text>
            <br />
            <Text type="secondary" className="text-sm">{record.company}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Space>
          <MailOutlined />
          <Text copyable>{email}</Text>
        </Space>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          <Text copyable>{phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => <Tag>{source}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button size="small" icon={<PhoneOutlined />}>Call</Button>
          <Button size="small" icon={<MailOutlined />}>Email</Button>
        </Space>
      ),
    },
  ];

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
            <Title level={2} className="!mb-2">Contacts</Title>
            <Text type="secondary">
              Manage your contacts and leads from various sources.
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setShowAddModal(true)}
          >
            Add Contact
          </Button>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Search
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
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

        {/* Contacts table */}
        <Table
          columns={columns}
          dataSource={filteredContacts}
          rowKey={(record) => record.id || record.email}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} contacts`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={<UserOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                description={
                  <div>
                    <Text strong>No contacts</Text>
                    <br />
                    <Text type="secondary">
                      {searchTerm ? 'No contacts match your search.' : 'Get started by adding your first contact.'}
                    </Text>
                  </div>
                }
              >
                {!searchTerm && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
                    Add Contact
                  </Button>
                )}
              </Empty>
            ),
          }}
        />

        {/* Add Contact Modal */}
        <Modal
          title="Add New Contact"
          open={showAddModal}
          onCancel={() => {
            setShowAddModal(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText="Add Contact"
          cancelText="Cancel"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddContact}
            requiredMark={false}
          >
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input placeholder="Enter first name" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input placeholder="Enter last name" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input placeholder="Enter email address" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>

            <Form.Item
              name="company"
              label="Company"
            >
              <Input placeholder="Enter company name" />
            </Form.Item>

            <Form.Item
              name="source"
              label="Source"
            >
              <Select placeholder="Select source">
                <Select.Option value="Website">Website</Select.Option>
                <Select.Option value="Referral">Referral</Select.Option>
                <Select.Option value="Social Media">Social Media</Select.Option>
                <Select.Option value="Email Campaign">Email Campaign</Select.Option>
                <Select.Option value="Manual">Manual</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
