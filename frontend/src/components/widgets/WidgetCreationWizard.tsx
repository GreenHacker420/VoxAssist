'use client';

import { useState, useEffect } from 'react';
import {
  Steps,
  Card,
  Form,
  Input,
  Button,
  Select,
  ColorPicker,
  Switch,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Divider,
  Tag,
  Tooltip,
  App
} from 'antd';
import { 
  InfoCircleOutlined, 
  EyeOutlined, 
  SettingOutlined, 
  SecurityScanOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetsService, type WidgetDTO } from '@/services/widgets';
import WebsiteAnalysisService, { type WebsiteAnalysisResult } from '@/services/websiteAnalysis';
import toast from 'react-hot-toast';
import BasicInfoStep from './steps/BasicInfoStep';
import AppearanceStep from './steps/AppearanceStep';
import BehaviorStep from './steps/BehaviorStep';
import PermissionsStep from './steps/PermissionsStep';
import PreviewStep from './steps/PreviewStep';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface WidgetFormData {
  name: string;
  contextUrl: string;
  appearance: {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    borderRadius: string;
    size: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark' | 'auto';
  };
  behavior: {
    autoOpen: boolean;
    autoOpenDelay: number;
    greeting: string;
    language: string;
    enableVoice: boolean;
    enableText: boolean;
    enableFileUpload: boolean;
    showBranding: boolean;
  };
  permissions: {
    collectPersonalData: boolean;
    storeCookies: boolean;
    recordAudio: boolean;
    shareWithThirdParty: boolean;
    allowedDomains: string[];
  };
  advanced: {
    customCSS: string;
    webhookUrl: string;
    analyticsEnabled: boolean;
    rateLimitEnabled: boolean;
    maxMessagesPerSession: number;
  };
}

interface WidgetCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (widget: WidgetDTO) => void;
  editWidget?: WidgetDTO | null;
}

const WIDGET_TEMPLATES = [
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Perfect for customer service and support inquiries',
    appearance: {
      position: 'bottom-right' as const,
      primaryColor: '#1890ff',
      secondaryColor: '#40a9ff',
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      size: 'medium' as const,
      theme: 'light' as const,
    },
    behavior: {
      autoOpen: false,
      autoOpenDelay: 5000,
      greeting: 'Hi! How can I help you today?',
      language: 'en',
      enableVoice: true,
      enableText: true,
      enableFileUpload: true,
      showBranding: true,
    },
    permissions: {
      collectPersonalData: false,
      storeCookies: true,
      recordAudio: false,
      shareWithThirdParty: false,
      allowedDomains: [],
    }
  },
  {
    id: 'sales-assistant',
    name: 'Sales Assistant',
    description: 'Designed to capture leads and assist with sales inquiries',
    appearance: {
      position: 'bottom-right' as const,
      primaryColor: '#52c41a',
      secondaryColor: '#73d13d',
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      size: 'large' as const,
      theme: 'light' as const,
    },
    behavior: {
      autoOpen: true,
      autoOpenDelay: 3000,
      greeting: 'Welcome! Interested in learning more about our products?',
      language: 'en',
      enableVoice: true,
      enableText: true,
      enableFileUpload: false,
      showBranding: true,
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple design that blends with any website',
    appearance: {
      position: 'bottom-left' as const,
      primaryColor: '#595959',
      secondaryColor: '#8c8c8c',
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      size: 'small' as const,
      theme: 'auto' as const,
    },
    behavior: {
      autoOpen: false,
      autoOpenDelay: 0,
      greeting: 'Hello! Need assistance?',
      language: 'en',
      enableVoice: false,
      enableText: true,
      enableFileUpload: false,
      showBranding: false,
    }
  }
];

export default function WidgetCreationWizard({
  open,
  onClose,
  onSuccess,
  editWidget
}: WidgetCreationWizardProps) {
  const { user, isDemoMode } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WidgetFormData>({
    name: editWidget?.name || '',
    contextUrl: editWidget?.contextUrl || '',
    appearance: {
      position: 'bottom-right',
      primaryColor: '#1890ff',
      secondaryColor: '#40a9ff',
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      size: 'medium',
      theme: 'light',
    },
    behavior: {
      autoOpen: false,
      autoOpenDelay: 5000,
      greeting: 'Hi! How can I help you today?',
      language: 'en',
      enableVoice: true,
      enableText: true,
      enableFileUpload: true,
      showBranding: true,
    },
    permissions: {
      collectPersonalData: false,
      storeCookies: true,
      recordAudio: false,
      shareWithThirdParty: false,
      allowedDomains: [],
    },
    advanced: {
      customCSS: '',
      webhookUrl: '',
      analyticsEnabled: true,
      rateLimitEnabled: true,
      maxMessagesPerSession: 50,
    }
  });

  // Auto-detect website information if contextUrl is provided
  const [websiteInfo, setWebsiteInfo] = useState<{
    title?: string;
    colors?: string[];
    favicon?: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    if (editWidget) {
      setFormData({
        name: editWidget.name,
        contextUrl: editWidget.contextUrl || '',
        appearance: {
          ...editWidget.appearance,
          theme: editWidget.appearance.theme || 'light',
        },
        behavior: {
          ...editWidget.behavior,
          autoOpenDelay: editWidget.behavior.autoOpenDelay || 5000,
          enableFileUpload: editWidget.behavior.enableFileUpload || true,
          showBranding: editWidget.behavior.showBranding || true,
        },
        permissions: {
          ...editWidget.permissions,
          allowedDomains: editWidget.permissions.allowedDomains || [],
        },
        advanced: editWidget.advanced || {
          customCSS: '',
          webhookUrl: '',
          analyticsEnabled: true,
          rateLimitEnabled: true,
          maxMessagesPerSession: 50,
        }
      });
    }
  }, [editWidget]);

  const analyzeWebsite = async (url: string) => {
    if (!url || !WebsiteAnalysisService.isValidURL(url)) {
      message.error('Please provide a valid HTTP or HTTPS URL');
      return;
    }

    try {
      // First validate the URL
      const validation = await WebsiteAnalysisService.validateURL(url);
      if (validation && !validation.valid) {
        message.warning(`URL validation warning: ${validation.message}`);
        // Continue with analysis even if validation shows warnings
      }

      // Perform the actual website analysis
      const result = await WebsiteAnalysisService.analyzeWebsite(url, {
        timeout: 10000,
        includePerformance: true
      });

      if (!result.success) {
        message.error(`Website analysis failed: ${result.error}`);
        return;
      }

      const analysis = result.data!;

      // Set website info for display
      setWebsiteInfo({
        title: analysis.title,
        colors: analysis.colors,
        favicon: analysis.favicon,
        description: analysis.description
      });

      // Generate and apply widget configuration suggestions
      const suggestedConfig = WebsiteAnalysisService.generateWidgetConfig(analysis);

      setFormData(prev => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          ...suggestedConfig.appearance
        },
        behavior: {
          ...prev.behavior,
          ...suggestedConfig.behavior
        }
      }));

      // Show success message with suggestions count
      const suggestionCount = analysis.suggestions.length;
      message.success(
        `Website analyzed successfully! ${suggestionCount} optimization suggestions applied.`
      );

      // Log suggestions for debugging
      console.log('Website analysis suggestions:', analysis.suggestions);

    } catch (error) {
      console.error('Website analysis failed:', error);
      message.error('Failed to analyze website. Please check the URL and try again.');
    }
  };

  const applyTemplate = (template: typeof WIDGET_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      appearance: template.appearance,
      behavior: template.behavior,
    }));
    message.success(`${template.name} template applied!`);
  };

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user?.organizationId && !isDemoMode) {
      toast.error('Organization ID is required. Please ensure you are properly authenticated.');
      return;
    }

    setLoading(true);
    try {
      const widgetData: WidgetDTO = {
        ...formData,
        id: editWidget?.id,
        organizationId: user?.organizationId || 1, // Use 1 for demo mode
        isActive: true,
        createdAt: editWidget?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let result: WidgetDTO;
      if (editWidget?.id) {
        result = await WidgetsService.update(editWidget.id, widgetData);
        toast.success('Widget updated successfully!');
      } else {
        result = await WidgetsService.create(user?.organizationId || 1, widgetData);
        toast.success('Widget created successfully!');
      }

      onSuccess(result);
    } catch (error) {
      console.error('Failed to save widget:', error);
      toast.error(`Failed to ${editWidget?.id ? 'update' : 'create'} widget. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Basic Info',
      icon: <InfoCircleOutlined />,
      description: 'Widget name and website details'
    },
    {
      title: 'Appearance',
      icon: <EyeOutlined />,
      description: 'Colors, position, and styling'
    },
    {
      title: 'Behavior',
      icon: <SettingOutlined />,
      description: 'Functionality and interactions'
    },
    {
      title: 'Permissions',
      icon: <SecurityScanOutlined />,
      description: 'Privacy and security settings'
    },
    {
      title: 'Preview',
      icon: <CheckCircleOutlined />,
      description: 'Review and generate embed code'
    }
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Title level={2} className="!mb-2 !text-gray-900">
                {editWidget ? 'Edit Widget' : 'Create New Widget'}
              </Title>
              <Text type="secondary" className="text-lg">
                Build a powerful communication widget for your website
              </Text>
            </div>
            <Button
              type="text"
              size="large"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-full w-10 h-10 flex items-center justify-center"
            >
              ✕
            </Button>
          </div>

          <Steps
            current={currentStep}
            items={steps}
            className="mb-8"
            size="default"
            type="default"
          />

          <div className="h-[600px] bg-gradient-to-br from-gray-50/50 to-white/50 rounded-2xl border border-gray-200/50 backdrop-blur-sm overflow-y-auto">
            {currentStep === 0 && (
              <BasicInfoStep
                formData={{ name: formData.name, contextUrl: formData.contextUrl }}
                onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
                onAnalyzeWebsite={analyzeWebsite}
                websiteInfo={websiteInfo}
              />
            )}
            {currentStep === 1 && (
              <AppearanceStep
                formData={{ appearance: formData.appearance }}
                onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
                templates={WIDGET_TEMPLATES}
                onApplyTemplate={applyTemplate}
              />
            )}
            {currentStep === 2 && (
              <BehaviorStep
                formData={{ behavior: formData.behavior }}
                onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
              />
            )}
            {currentStep === 3 && (
              <PermissionsStep
                formData={{ permissions: formData.permissions }}
                onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
              />
            )}
            {currentStep === 4 && (
              <PreviewStep
                formData={formData}
              />
            )}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200/50">
            <Button
              size="large"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="min-w-[120px]"
            >
              Previous
            </Button>
            <div className="flex items-center space-x-2">
              <Text type="secondary" className="text-sm">
                Step {currentStep + 1} of {steps.length}
              </Text>
            </div>
            <Space>
              <Button
                size="large"
                onClick={onClose}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleNext}
                  className="min-w-[120px]"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  onClick={handleSubmit}
                  className="min-w-[140px]"
                >
                  {editWidget ? 'Update Widget' : 'Create Widget'}
                </Button>
              )}
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
}
