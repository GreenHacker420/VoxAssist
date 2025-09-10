'use client';

import { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Select, 
  ColorPicker, 
  Slider, 
  Typography, 
  Space, 
  Button, 
  Divider,
  Tag,
  Radio,
  Tooltip
} from 'antd';
import { 
  EyeOutlined, 
  BgColorsOutlined, 
  SettingOutlined,
  MobileOutlined,
  DesktopOutlined,
  TabletOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface AppearanceStepProps {
  formData: {
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
  };
  onChange: (data: any) => void;
  templates: Array<{
    id: string;
    name: string;
    description: string;
    appearance: any;
  }>;
  onApplyTemplate: (template: any) => void;
}

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right', icon: '↘️' },
  { value: 'bottom-left', label: 'Bottom Left', icon: '↙️' },
  { value: 'top-right', label: 'Top Right', icon: '↗️' },
  { value: 'top-left', label: 'Top Left', icon: '↖️' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small', dimensions: '300×400px' },
  { value: 'medium', label: 'Medium', dimensions: '350×500px' },
  { value: 'large', label: 'Large', dimensions: '400×600px' },
];

export default function AppearanceStep({ 
  formData, 
  onChange, 
  templates, 
  onApplyTemplate 
}: AppearanceStepProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const updateAppearance = (key: string, value: any) => {
    onChange({
      appearance: {
        ...formData.appearance,
        [key]: value
      }
    });
  };

  const getPreviewStyle = () => {
    const { appearance } = formData;
    return {
      backgroundColor: appearance.backgroundColor,
      borderRadius: appearance.borderRadius,
      border: `2px solid ${appearance.primaryColor}`,
      color: appearance.textColor,
    };
  };

  const getDevicePreviewSize = () => {
    switch (previewDevice) {
      case 'mobile':
        return { width: '320px', height: '568px' };
      case 'tablet':
        return { width: '768px', height: '432px' };
      default:
        return { width: '1024px', height: '576px' };
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <Title level={3} className="!mb-3 !text-gray-900">
          Design your widget
        </Title>
        <Text className="text-lg text-gray-600 max-w-2xl mx-auto block">
          Customize the appearance to match your brand and website design
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Templates Section */}
        <Col xs={24}>
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <Title level={4} className="!mb-4 !text-gray-900">
              <BgColorsOutlined className="mr-2 text-purple-500" />
              Quick Templates
            </Title>
            <Row gutter={[16, 16]}>
              {templates.map((template) => (
                <Col xs={24} sm={8} key={template.id}>
                  <Card
                    size="small"
                    hoverable
                    className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/90 backdrop-blur-sm border-gray-200/50"
                    onClick={() => onApplyTemplate(template)}
                  >
                    <div className="text-center">
                      <div 
                        className="w-full h-16 rounded-lg mb-3 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${template.appearance.primaryColor}, ${template.appearance.secondaryColor})`,
                          borderRadius: template.appearance.borderRadius,
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                        >
                          💬
                        </div>
                      </div>
                      <Title level={5} className="!mb-1">{template.name}</Title>
                      <Text type="secondary" className="text-sm">
                        {template.description}
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Configuration Section */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={4} className="!mb-4">
              <SettingOutlined className="mr-2 text-blue-500" />
              Appearance Settings
            </Title>
            
            <div className="space-y-6">
              {/* Position */}
              <div>
                <Text strong className="block mb-2">Position</Text>
                <Radio.Group
                  value={formData.appearance.position}
                  onChange={(e) => updateAppearance('position', e.target.value)}
                  className="w-full"
                >
                  <Row gutter={[8, 8]}>
                    {POSITION_OPTIONS.map((option) => (
                      <Col xs={12} key={option.value}>
                        <Radio.Button 
                          value={option.value} 
                          className="w-full text-center"
                        >
                          <Space>
                            <span>{option.icon}</span>
                            {option.label}
                          </Space>
                        </Radio.Button>
                      </Col>
                    ))}
                  </Row>
                </Radio.Group>
              </div>

              {/* Size */}
              <div>
                <Text strong className="block mb-2">Size</Text>
                <Select
                  value={formData.appearance.size}
                  onChange={(value) => updateAppearance('size', value)}
                  className="w-full"
                  size="large"
                >
                  {SIZE_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      <Space>
                        <Text strong>{option.label}</Text>
                        <Text type="secondary">({option.dimensions})</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Theme */}
              <div>
                <Text strong className="block mb-2">Theme</Text>
                <Radio.Group
                  value={formData.appearance.theme}
                  onChange={(e) => updateAppearance('theme', e.target.value)}
                  className="w-full"
                >
                  <Radio.Button value="light">Light</Radio.Button>
                  <Radio.Button value="dark">Dark</Radio.Button>
                  <Radio.Button value="auto">Auto</Radio.Button>
                </Radio.Group>
              </div>

              <Divider />

              {/* Colors */}
              <div className="space-y-4">
                <Text strong className="block">Colors</Text>
                
                <Row gutter={[16, 16]}>
                  <Col xs={12}>
                    <div>
                      <Text className="block mb-2">Primary Color</Text>
                      <ColorPicker
                        value={formData.appearance.primaryColor}
                        onChange={(color) => updateAppearance('primaryColor', color.toHexString())}
                        showText
                        size="large"
                        className="w-full"
                      />
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div>
                      <Text className="block mb-2">Secondary Color</Text>
                      <ColorPicker
                        value={formData.appearance.secondaryColor}
                        onChange={(color) => updateAppearance('secondaryColor', color.toHexString())}
                        showText
                        size="large"
                        className="w-full"
                      />
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div>
                      <Text className="block mb-2">Text Color</Text>
                      <ColorPicker
                        value={formData.appearance.textColor}
                        onChange={(color) => updateAppearance('textColor', color.toHexString())}
                        showText
                        size="large"
                        className="w-full"
                      />
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div>
                      <Text className="block mb-2">Background</Text>
                      <ColorPicker
                        value={formData.appearance.backgroundColor}
                        onChange={(color) => updateAppearance('backgroundColor', color.toHexString())}
                        showText
                        size="large"
                        className="w-full"
                      />
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Border Radius */}
              <div>
                <Text strong className="block mb-2">Border Radius</Text>
                <Slider
                  min={0}
                  max={24}
                  value={parseInt(formData.appearance.borderRadius)}
                  onChange={(value) => updateAppearance('borderRadius', `${value}px`)}
                  marks={{
                    0: '0px',
                    8: '8px',
                    12: '12px',
                    16: '16px',
                    24: '24px'
                  }}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Preview Section */}
        <Col xs={24} lg={12}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Title level={4} className="!mb-0">
                <EyeOutlined className="mr-2 text-green-500" />
                Live Preview
              </Title>
              <Space>
                <Tooltip title="Desktop">
                  <Button
                    type={previewDevice === 'desktop' ? 'primary' : 'default'}
                    icon={<DesktopOutlined />}
                    onClick={() => setPreviewDevice('desktop')}
                  />
                </Tooltip>
                <Tooltip title="Tablet">
                  <Button
                    type={previewDevice === 'tablet' ? 'primary' : 'default'}
                    icon={<TabletOutlined />}
                    onClick={() => setPreviewDevice('tablet')}
                  />
                </Tooltip>
                <Tooltip title="Mobile">
                  <Button
                    type={previewDevice === 'mobile' ? 'primary' : 'default'}
                    icon={<MobileOutlined />}
                    onClick={() => setPreviewDevice('mobile')}
                  />
                </Tooltip>
              </Space>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <div 
                className="relative bg-white rounded-lg shadow-lg overflow-hidden"
                style={getDevicePreviewSize()}
              >
                {/* Mock website content */}
                <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>

                {/* Widget Preview */}
                <div 
                  className={`absolute ${
                    formData.appearance.position.includes('bottom') ? 'bottom-4' : 'top-4'
                  } ${
                    formData.appearance.position.includes('right') ? 'right-4' : 'left-4'
                  }`}
                >
                  <div
                    className={`
                      ${formData.appearance.size === 'small' ? 'w-12 h-12' : 
                        formData.appearance.size === 'medium' ? 'w-14 h-14' : 'w-16 h-16'}
                      rounded-full shadow-lg cursor-pointer flex items-center justify-center
                      transition-all duration-200 hover:scale-110
                    `}
                    style={{
                      backgroundColor: formData.appearance.primaryColor,
                      borderRadius: formData.appearance.borderRadius,
                    }}
                  >
                    <span className="text-white text-xl">💬</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <Text type="secondary" className="text-sm">
                This preview shows how your widget will appear on different devices. 
                The actual widget will be interactive and expand when clicked.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
