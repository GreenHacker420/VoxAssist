'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Avatar, 
  Upload, 
  Space, 
  Divider, 
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  App
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  EditOutlined,
  UploadOutlined,
  SaveOutlined,
  LockOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { message } = App.useApp();
  const { user, updateProfile, isDemoMode } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (values: any) => {
    setIsLoading(true);
    try {
      await updateProfile(values);
      setIsEditing(false);
      message.success('Profile updated successfully');
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setPasswordLoading(true);
    try {
      // TODO: Implement password change API
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = (info: any) => {
    if (info.file.status === 'done') {
      message.success('Avatar uploaded successfully');
    } else if (info.file.status === 'error') {
      message.error('Avatar upload failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your account information and preferences.
          </p>
        </div>

        {isDemoMode && (
          <Card className="border-orange-200 bg-orange-50">
            <div className="flex items-center space-x-2">
              <Tag color="orange">Demo Mode</Tag>
              <Text type="secondary">
                Profile changes in demo mode are temporary and won't be saved.
              </Text>
            </div>
          </Card>
        )}

        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title="Personal Information" className="mb-6">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar 
                  size={80} 
                  icon={<UserOutlined />}
                  src={user?.avatar}
                />
                <div>
                  <Upload
                    name="avatar"
                    showUploadList={false}
                    onChange={handleAvatarUpload}
                    disabled={isDemoMode}
                  >
                    <Button icon={<UploadOutlined />} disabled={isDemoMode}>
                      Change Avatar
                    </Button>
                  </Upload>
                  <div className="text-xs text-gray-500 mt-1">
                    JPG, PNG up to 2MB
                  </div>
                </div>
              </div>

              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  name: user?.name,
                  email: user?.email,
                  phone: user?.phone || '',
                  company: user?.company || '',
                  role: user?.role || ''
                }}
                onFinish={handleProfileUpdate}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label="Full Name"
                      rules={[{ required: true, message: 'Please enter your name' }]}
                    >
                      <Input 
                        prefix={<UserOutlined />}
                        disabled={!isEditing}
                        placeholder="Enter your full name"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label="Email Address"
                      rules={[
                        { required: true, message: 'Please enter your email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined />}
                        disabled={!isEditing}
                        placeholder="Enter your email"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label="Phone Number"
                    >
                      <Input 
                        prefix={<PhoneOutlined />}
                        disabled={!isEditing}
                        placeholder="Enter your phone number"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="company"
                      label="Company"
                    >
                      <Input 
                        disabled={!isEditing}
                        placeholder="Enter your company"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="role"
                  label="Role"
                >
                  <Input 
                    disabled={!isEditing}
                    placeholder="Enter your role"
                  />
                </Form.Item>

                <div className="flex justify-end space-x-2">
                  {isEditing ? (
                    <>
                      <Button onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="primary" 
                        htmlType="submit"
                        loading={isLoading}
                        icon={<SaveOutlined />}
                        disabled={isDemoMode}
                      >
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />}
                      onClick={() => setIsEditing(true)}
                      disabled={isDemoMode}
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </Form>
            </Card>

            <Card title="Change Password">
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handlePasswordChange}
              >
                <Form.Item
                  name="currentPassword"
                  label="Current Password"
                  rules={[{ required: true, message: 'Please enter your current password' }]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Enter current password"
                    disabled={isDemoMode}
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="New Password"
                  rules={[
                    { required: true, message: 'Please enter a new password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Enter new password"
                    disabled={isDemoMode}
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Confirm New Password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Please confirm your new password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Confirm new password"
                    disabled={isDemoMode}
                  />
                </Form.Item>

                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={passwordLoading}
                  disabled={isDemoMode}
                >
                  Change Password
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Account Statistics" className="mb-6">
              <Space direction="vertical" className="w-full">
                <Statistic 
                  title="Total Calls" 
                  value={user?.totalCalls || 0} 
                  prefix={<PhoneOutlined />}
                />
                <Divider />
                <Statistic 
                  title="Account Type" 
                  value={isDemoMode ? 'Demo' : (user?.plan || 'Free')}
                />
                <Divider />
                <Statistic 
                  title="Member Since" 
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                />
              </Space>
            </Card>

            <Card title="Account Status">
              <Space direction="vertical" className="w-full">
                <div className="flex justify-between items-center">
                  <Text>Email Verified</Text>
                  <Tag color={user?.emailVerified ? 'green' : 'orange'}>
                    {user?.emailVerified ? 'Verified' : 'Pending'}
                  </Tag>
                </div>
                <div className="flex justify-between items-center">
                  <Text>Two-Factor Auth</Text>
                  <Tag color={user?.twoFactorEnabled ? 'green' : 'default'}>
                    {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Tag>
                </div>
                <div className="flex justify-between items-center">
                  <Text>Account Status</Text>
                  <Tag color="green">Active</Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  );
}
