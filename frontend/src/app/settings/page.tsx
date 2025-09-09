'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProviderSettings from '@/components/ProviderSettings';
import { Card, Tabs, Typography } from 'antd';

const { Title } = Typography;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('provider');

  const handleProviderSave = async (config: unknown) => {
    console.log('Saving provider config:', config);
    // Handle provider configuration save
  };

  const handleProviderTest = async (config: unknown): Promise<boolean> => {
    console.log('Testing provider config:', config);
    // Handle provider connection test
    return true;
  };

  const tabItems = [
    {
      key: 'provider',
      label: 'Provider Settings',
      children: (
        <ProviderSettings 
          onSave={handleProviderSave}
          onTest={handleProviderTest}
        />
      ),
    },
    {
      key: 'voice',
      label: 'Voice Settings',
      children: (
        <Card>
          <Title level={4}>Voice Configuration</Title>
          <p>Configure voice settings, speed, pitch, and language preferences.</p>
        </Card>
      ),
    },
    {
      key: 'ai',
      label: 'AI Settings',
      children: (
        <Card>
          <Title level={4}>AI Configuration</Title>
          <p>Configure AI model, temperature, and response settings.</p>
        </Card>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure your communication providers, voice settings, and AI preferences.
          </p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </div>
    </DashboardLayout>
  );
}
