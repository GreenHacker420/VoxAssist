'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Typography,
  Space,
  message,
  Spin,
  Alert,
  Form,
  Input,
  Select,
  Switch,
  ColorPicker,
  InputNumber,
  Divider
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  EyeOutlined
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { WidgetsService, type WidgetDTO } from '@/services/widgets';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function EditWidgetPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const widgetId = params.id as string;

  const [widget, setWidget] = useState<WidgetDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (widgetId) {
      loadWidget();
    }
  }, [widgetId]);

  const loadWidget = async () => {
    try {
      setLoading(true);
      const widgetData = await WidgetsService.get(widgetId);
      setWidget(widgetData);
      
      // Populate form with widget data
      form.setFieldsValue({
        name: widgetData.name,
        contextUrl: widgetData.contextUrl,
        isActive: widgetData.isActive,
        // Appearance
        position: widgetData.appearance?.position,
        primaryColor: widgetData.appearance?.primaryColor,
        secondaryColor: widgetData.appearance?.secondaryColor,
        textColor: widgetData.appearance?.textColor,
        backgroundColor: widgetData.appearance?.backgroundColor,
        borderRadius: widgetData.appearance?.borderRadius,
        size: widgetData.appearance?.size,
        theme: widgetData.appearance?.theme,
        // Behavior
        autoOpen: widgetData.behavior?.autoOpen,
        autoOpenDelay: widgetData.behavior?.autoOpenDelay,
        greeting: widgetData.behavior?.greeting,
        language: widgetData.behavior?.language,
        enableVoice: widgetData.behavior?.enableVoice,
        enableText: widgetData.behavior?.enableText,
        enableFileUpload: widgetData.behavior?.enableFileUpload,
        showBranding: widgetData.behavior?.showBranding,
        // Permissions
        collectPersonalData: widgetData.permissions?.collectPersonalData,
        storeCookies: widgetData.permissions?.storeCookies,
        recordAudio: widgetData.permissions?.recordAudio,
        shareWithThirdParty: widgetData.permissions?.shareWithThirdParty,
        allowedDomains: widgetData.permissions?.allowedDomains?.join(', '),
      });
    } catch (error) {
      console.error('Error loading widget:', error);
      setError('Failed to load widget details');
      message.error('Failed to load widget details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      setSaving(true);
      
      const updateData: Partial<WidgetDTO> = {
        name: values.name as string,
        contextUrl: values.contextUrl as string,
        isActive: values.isActive as boolean,
        appearance: {
          position: values.position as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
          primaryColor: values.primaryColor as string,
          secondaryColor: values.secondaryColor as string,
          textColor: values.textColor as string,
          backgroundColor: values.backgroundColor as string,
          borderRadius: values.borderRadius as string,
          size: values.size as 'small' | 'medium' | 'large',
          theme: values.theme as 'light' | 'dark' | 'auto',
        },
        behavior: {
          autoOpen: values.autoOpen as boolean,
          autoOpenDelay: (values.autoOpenDelay as number) || 3000,
          greeting: values.greeting as string,
          language: values.language as string,
          enableVoice: values.enableVoice as boolean,
          enableText: values.enableText as boolean,
          enableFileUpload: values.enableFileUpload as boolean,
          showBranding: values.showBranding as boolean,
        },
        permissions: {
          collectPersonalData: values.collectPersonalData as boolean,
          storeCookies: values.storeCookies as boolean,
          recordAudio: values.recordAudio as boolean,
          shareWithThirdParty: values.shareWithThirdParty as boolean,
          allowedDomains: values.allowedDomains ? (values.allowedDomains as string).split(',').map((d: string) => d.trim()) : [],
        }
      };

      await WidgetsService.update(widgetId, updateData);
      message.success('Widget updated successfully');
      router.push(`/widgets/${widgetId}`);
    } catch (error) {
      console.error('Error updating widget:', error);
      message.error('Failed to update widget');
    } finally {
      setSaving(false);
    }
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
              Edit Widget: {widget.name}
            </Title>
            <Text type="secondary">
              Customize your widget&apos;s appearance and behavior
            </Text>
          </div>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(`/widgets/${widgetId}`)}
            >
              Back
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => router.push(`/widgets/embed/${widgetId}`)}
            >
              Preview
            </Button>
          </Space>
        </div>

        {/* Edit Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          className="space-y-6"
        >
          {/* Basic Information */}
          <Card title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Widget Name"
                name="name"
                rules={[{ required: true, message: 'Please enter widget name' }]}
              >
                <Input placeholder="Enter widget name" />
              </Form.Item>
              
              <Form.Item
                label="Context URL"
                name="contextUrl"
              >
                <Input placeholder="https://your-website.com" />
              </Form.Item>
              
              <Form.Item
                label="Status"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </div>
          </Card>

          {/* Appearance */}
          <Card title="Appearance">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Form.Item label="Position" name="position">
                <Select>
                  <Select.Option value="bottom-right">Bottom Right</Select.Option>
                  <Select.Option value="bottom-left">Bottom Left</Select.Option>
                  <Select.Option value="top-right">Top Right</Select.Option>
                  <Select.Option value="top-left">Top Left</Select.Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="Size" name="size">
                <Select>
                  <Select.Option value="small">Small</Select.Option>
                  <Select.Option value="medium">Medium</Select.Option>
                  <Select.Option value="large">Large</Select.Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="Theme" name="theme">
                <Select>
                  <Select.Option value="light">Light</Select.Option>
                  <Select.Option value="dark">Dark</Select.Option>
                  <Select.Option value="auto">Auto</Select.Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="Primary Color" name="primaryColor">
                <ColorPicker showText />
              </Form.Item>
              
              <Form.Item label="Secondary Color" name="secondaryColor">
                <ColorPicker showText />
              </Form.Item>
              
              <Form.Item label="Text Color" name="textColor">
                <ColorPicker showText />
              </Form.Item>
              
              <Form.Item label="Background Color" name="backgroundColor">
                <ColorPicker showText />
              </Form.Item>
              
              <Form.Item label="Border Radius" name="borderRadius">
                <Input placeholder="12px" />
              </Form.Item>
            </div>
          </Card>

          {/* Behavior */}
          <Card title="Behavior">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="Auto Open" name="autoOpen" valuePropName="checked">
                <Switch />
              </Form.Item>
              
              <Form.Item label="Auto Open Delay (ms)" name="autoOpenDelay">
                <InputNumber min={0} max={30000} step={1000} />
              </Form.Item>
              
              <Form.Item label="Greeting Message" name="greeting" className="md:col-span-2">
                <TextArea rows={2} placeholder="Hi! How can I help you today?" />
              </Form.Item>
              
              <Form.Item label="Language" name="language">
                <Select>
                  <Select.Option value="en">English</Select.Option>
                  <Select.Option value="es">Spanish</Select.Option>
                  <Select.Option value="fr">French</Select.Option>
                  <Select.Option value="de">German</Select.Option>
                </Select>
              </Form.Item>
              
              <div className="space-y-4">
                <Form.Item label="Enable Voice" name="enableVoice" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item label="Enable Text" name="enableText" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item label="Enable File Upload" name="enableFileUpload" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item label="Show Branding" name="showBranding" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </div>
            </div>
          </Card>

          {/* Permissions */}
          <Card title="Privacy & Permissions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Form.Item label="Collect Personal Data" name="collectPersonalData" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item label="Store Cookies" name="storeCookies" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item label="Record Audio" name="recordAudio" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item label="Share with Third Party" name="shareWithThirdParty" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </div>
              
              <Form.Item label="Allowed Domains (comma-separated)" name="allowedDomains">
                <TextArea 
                  rows={4} 
                  placeholder="example.com, subdomain.example.com"
                />
              </Form.Item>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Button onClick={() => router.push(`/widgets/${widgetId}`)}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={saving}
              icon={<SaveOutlined />}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </div>
    </DashboardLayout>
  );
}
