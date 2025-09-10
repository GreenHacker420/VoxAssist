'use client';

import { 
  Card, 
  Row, 
  Col, 
  Switch, 
  Input, 
  Typography, 
  Space, 
  Alert,
  Tag,
  Button,
  Divider,
  Tooltip
} from 'antd';
import {
  SecurityScanOutlined,
  SafetyOutlined,
  EyeOutlined,
  SoundOutlined,
  ShareAltOutlined,
  GlobalOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

interface WidgetPermissions {
  collectPersonalData: boolean;
  storeCookies: boolean;
  recordAudio: boolean;
  shareWithThirdParty: boolean;
  allowedDomains: string[];
}

interface PermissionsStepProps {
  formData: { permissions: WidgetPermissions };
  onChange: (data: { permissions: WidgetPermissions }) => void;
}

export default function PermissionsStep({ formData, onChange }: PermissionsStepProps) {
  const [newDomain, setNewDomain] = useState('');

  const updatePermissions = (key: string, value: boolean | string[]) => {
    onChange({
      permissions: {
        ...formData.permissions,
        [key]: value
      }
    });
  };

  const addDomain = () => {
    if (newDomain && !formData.permissions.allowedDomains.includes(newDomain)) {
      updatePermissions('allowedDomains', [...formData.permissions.allowedDomains, newDomain]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    updatePermissions('allowedDomains', formData.permissions.allowedDomains.filter(d => d !== domain));
  };

  const getPrivacyLevel = () => {
    const permissions = formData.permissions;
    let score = 0;
    if (!permissions.collectPersonalData) score += 25;
    if (!permissions.recordAudio) score += 25;
    if (!permissions.shareWithThirdParty) score += 25;
    if (permissions.allowedDomains.length > 0) score += 25;

    if (score >= 75) return { level: 'High', color: 'green', description: 'Excellent privacy protection' };
    if (score >= 50) return { level: 'Medium', color: 'orange', description: 'Good privacy protection' };
    return { level: 'Basic', color: 'red', description: 'Consider enhancing privacy settings' };
  };

  const privacyLevel = getPrivacyLevel();

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <Title level={3} className="!mb-3 !text-gray-900">
          Privacy & Security Settings
        </Title>
        <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
          Configure data collection and security permissions to ensure compliance and user trust
        </Paragraph>
      </div>

      {/* Privacy Level Indicator */}
      <Card className={`border-${privacyLevel.color}-200 bg-${privacyLevel.color}-50`}>
        <Row gutter={16} align="middle">
          <Col>
            <div className={`w-12 h-12 bg-${privacyLevel.color}-100 rounded-full flex items-center justify-center`}>
              <SafetyOutlined className={`text-${privacyLevel.color}-600 text-xl`} />
            </div>
          </Col>
          <Col flex={1}>
            <div className="flex items-center space-x-2 mb-1">
              <Title level={5} className="!mb-0">
                Privacy Level: 
              </Title>
              <Tag color={privacyLevel.color} className="font-medium">
                {privacyLevel.level}
              </Tag>
            </div>
            <Text type="secondary">{privacyLevel.description}</Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Data Collection Permissions */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={4} className="!mb-4">
              <EyeOutlined className="mr-2 text-blue-500" />
              Data Collection
            </Title>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Text strong>Collect Personal Data</Text>
                    <Tooltip title="Names, email addresses, phone numbers, etc.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </div>
                  <Text type="secondary" className="text-sm">
                    Allow collection of user names, emails, and contact information
                  </Text>
                </div>
                <Switch
                  checked={formData.permissions.collectPersonalData}
                  onChange={(checked) => updatePermissions('collectPersonalData', checked)}
                />
              </div>

              <Divider />

              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <Text strong className="block mb-1">Store Cookies</Text>
                  <Text type="secondary" className="text-sm">
                    Store session data and user preferences in browser cookies
                  </Text>
                </div>
                <Switch
                  checked={formData.permissions.storeCookies}
                  onChange={(checked) => updatePermissions('storeCookies', checked)}
                />
              </div>

              <Divider />

              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <SoundOutlined className="text-purple-500" />
                    <Text strong>Record Audio</Text>
                  </div>
                  <Text type="secondary" className="text-sm">
                    Record voice messages for transcription and analysis
                  </Text>
                </div>
                <Switch
                  checked={formData.permissions.recordAudio}
                  onChange={(checked) => updatePermissions('recordAudio', checked)}
                />
              </div>

              <Divider />

              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <ShareAltOutlined className="text-orange-500" />
                    <Text strong>Share with Third Parties</Text>
                  </div>
                  <Text type="secondary" className="text-sm">
                    Allow sharing data with analytics and integration partners
                  </Text>
                </div>
                <Switch
                  checked={formData.permissions.shareWithThirdParty}
                  onChange={(checked) => updatePermissions('shareWithThirdParty', checked)}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Domain Restrictions */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={4} className="!mb-4">
              <GlobalOutlined className="mr-2 text-green-500" />
              Domain Restrictions
            </Title>
            
            <div className="space-y-4">
              <div>
                <Text strong className="block mb-2">Allowed Domains</Text>
                <Text type="secondary" className="text-sm mb-3">
                  Restrict widget usage to specific domains. Leave empty to allow all domains.
                </Text>
                
                <div className="flex space-x-2 mb-3">
                  <Input
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onPressEnter={addDomain}
                    className="flex-1"
                  />
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={addDomain}
                    disabled={!newDomain}
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.permissions.allowedDomains.map((domain, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <Text>{domain}</Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeDomain(domain)}
                        className="text-red-500 hover:text-red-700"
                      />
                    </div>
                  ))}
                  {formData.permissions.allowedDomains.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Text type="secondary" className="text-sm">
                        No domain restrictions. Widget can be embedded on any website.
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* GDPR Compliance */}
        <Col xs={24}>
          <Card>
            <Title level={4} className="!mb-4">
              <LockOutlined className="mr-2 text-indigo-500" />
              GDPR & Privacy Compliance
            </Title>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Alert
                  message="GDPR Ready"
                  description="VoxAssist automatically handles GDPR compliance including consent management, data portability, and deletion rights."
                  type="success"
                  showIcon
                  className="h-full"
                />
              </Col>
              <Col xs={24} lg={8}>
                <Alert
                  message="Data Encryption"
                  description="All collected data is encrypted in transit and at rest using industry-standard AES-256 encryption."
                  type="info"
                  showIcon
                  className="h-full"
                />
              </Col>
              <Col xs={24} lg={8}>
                <Alert
                  message="Audit Logging"
                  description="All data access and modifications are logged for compliance and security auditing purposes."
                  type="warning"
                  showIcon
                  className="h-full"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Privacy Recommendations */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <Row gutter={16} align="middle">
          <Col>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <SecurityScanOutlined className="text-blue-600 text-xl" />
            </div>
          </Col>
          <Col flex={1}>
            <Title level={5} className="!mb-2">
              Privacy Best Practices
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Text type="secondary" className="text-sm">
                ✓ Only collect data you actually need
              </Text>
              <Text type="secondary" className="text-sm">
                ✓ Be transparent about data usage
              </Text>
              <Text type="secondary" className="text-sm">
                ✓ Restrict domains for better security
              </Text>
              <Text type="secondary" className="text-sm">
                ✓ Regular review and update permissions
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
