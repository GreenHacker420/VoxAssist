'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

import { Form, Input, Button, Card, Alert, Space, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const { Title, Text, Link: AntLink } = Typography;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch {
      // Error is handled by the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (email: string, password: string) => {
    form.setFieldsValue({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="shadow-lg premium-card">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600 mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <Title level={2} className="!mb-2">Sign in to VoxAssist</Title>
            <Text type="secondary">AI-powered voice calling platform</Text>
          </div>

          <Alert
            message="Test Account"
            description={
              <Space direction="vertical" className="w-full mt-3">
                <Text className="text-xs">Use this test account to explore the platform:</Text>
                <div className="flex justify-between items-center bg-gray-50 rounded p-2">
                  <div>
                    <div className="text-xs font-medium">Test Account</div>
                    <div className="text-xs text-gray-600">test@example.com</div>
                    <div className="text-xs text-gray-500">Password: TestPassword123!</div>
                  </div>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => fillDemoCredentials('test@example.com', 'TestPassword123!')}
                  >
                    Use Test Account
                  </Button>
                </div>
              </Space>
            }
            type="info"
            showIcon
            className="mb-6"
          />

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label="Email address"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please input your password!' },
                { min: 6, message: 'Password must be at least 6 characters!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="text-center mb-4">
              <Link href="/forgot-password" className="ant-typography ant-typography-link">
                Forgot your password?
              </Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                className="w-full"
                size="large"
              >
                Sign in
              </Button>
            </Form.Item>

            <Divider />

            <div className="text-center">
              <Text type="secondary">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="ant-typography ant-typography-link">
                  Sign up
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}