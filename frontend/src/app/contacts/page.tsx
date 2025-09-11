'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { ContactsService, Contact, CreateContactData } from '@/services/contacts';
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Load contacts from API
  const loadContacts = async (page = 1, search = '') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ContactsService.getContacts({
        page,
        limit: pagination.pageSize,
        search: search || undefined
      });

      setContacts(response.contacts);
      setPagination(prev => ({
        ...prev,
        current: response.pagination.page,
        total: response.pagination.total
      }));
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load contacts');
      message.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = async (values: { name: string; phone: string; email?: string; company?: string }) => {
    try {
      const contactData: CreateContactData = {
        name: values.name,
        phone: values.phone,
        email: values.email,
        metadata: {
          company: values.company || '',
          source: 'Manual'
        }
      };

      await ContactsService.createContact(contactData);
      setShowAddModal(false);
      form.resetFields();
      message.success('Contact added successfully!');

      // Reload contacts to show the new one
      await loadContacts(pagination.current, searchTerm);
    } catch (error) {
      console.error('Failed to add contact:', error);
      message.error(error instanceof Error ? error.message : 'Failed to add contact');
    }
  };

  // Handle search
  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    await loadContacts(1, value);
  };

  // Handle pagination change
  const handleTableChange = async (page: number, pageSize?: number) => {
    if (pageSize && pageSize !== pagination.pageSize) {
      setPagination(prev => ({ ...prev, pageSize }));
    }
    await loadContacts(page, searchTerm);
  };

  const columns = [
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Contact) => (
        <div className="flex items-center space-x-3">
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-sm">
                {(record.metadata?.company as string) || 'No company'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        email ? (
          <Space>
            <MailOutlined />
            <Text copyable>{email}</Text>
          </Space>
        ) : (
          <Text type="secondary">No email</Text>
        )
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          <Text copyable>{ContactsService.formatPhoneNumber(phone)}</Text>
        </Space>
      ),
    },
    {
      title: 'Source',
      key: 'source',
      render: (record: Contact) => (
        <Tag>{(record.metadata?.source as string) || 'Unknown'}</Tag>
      ),
    },
    {
      title: 'Calls',
      key: 'calls',
      render: (record: Contact) => (
        <Text>{record._count?.calls || 0}</Text>
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
      render: (record: Contact) => (
        <Space>
          <Button size="small" icon={<PhoneOutlined />}>Call</Button>
          {record.email && (
            <Button size="small" icon={<MailOutlined />}>Email</Button>
          )}
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
            onSearch={handleSearch}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            loading={isLoading}
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
          dataSource={contacts}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} contacts`,
            onChange: handleTableChange,
            onShowSizeChange: (current, size) => handleTableChange(current, size),
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
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter full name' }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input placeholder="Enter email address (optional)" />
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
              <Input placeholder="Enter company name (optional)" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
