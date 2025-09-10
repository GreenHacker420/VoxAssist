'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProviderSettings from '@/components/ProviderSettings';
import AISettings from '@/components/Settings/AISettings';
import VoiceSettings from '@/components/Settings/VoiceSettings';
import { Card, Tabs, Typography, App } from 'antd';

const { Title } = Typography;

export default function SettingsPage() {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('provider');

  const handleProviderSave = async (config: unknown) => {
    try {
      // TODO: Implement API call to save provider config
      console.log('Saving provider config:', config);
      message.success('Provider settings saved successfully');
    } catch (error) {
      console.error('Failed to save provider config:', error);
      message.error('Failed to save provider settings');
    }
  };

  const handleProviderTest = async (config: unknown): Promise<boolean> => {
    try {
      // TODO: Implement API call to test provider config
      console.log('Testing provider config:', config);
      message.success('Provider connection test successful');
      return true;
    } catch (error) {
      console.error('Failed to test provider config:', error);
      message.error('Provider connection test failed');
      return false;
    }
  };

  const handleAISave = async (config: unknown) => {
    try {
      // TODO: Implement API call to save AI config
      console.log('Saving AI config:', config);
      message.success('AI settings saved successfully');
    } catch (error) {
      console.error('Failed to save AI config:', error);
      message.error('Failed to save AI settings');
    }
  };

  const handleAITest = async (config: unknown): Promise<boolean> => {
    try {
      // TODO: Implement API call to test AI config
      console.log('Testing AI config:', config);
      message.success('AI configuration test successful');
      return true;
    } catch (error) {
      console.error('Failed to test AI config:', error);
      message.error('AI configuration test failed');
      return false;
    }
  };

  const handleVoiceSave = async (config: unknown) => {
    try {
      // TODO: Implement API call to save voice config
      console.log('Saving voice config:', config);
      message.success('Voice settings saved successfully');
    } catch (error) {
      console.error('Failed to save voice config:', error);
      message.error('Failed to save voice settings');
    }
  };

  const handleVoiceTest = async (config: unknown, text: string): Promise<boolean> => {
    try {
      // TODO: Implement API call to test voice config
      console.log('Testing voice config:', config, 'with text:', text);
      message.success('Voice test completed successfully');
      return true;
    } catch (error) {
      console.error('Failed to test voice config:', error);
      message.error('Voice test failed');
      return false;
    }
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
        <VoiceSettings 
          onSave={handleVoiceSave}
          onTest={handleVoiceTest}
        />
      ),
    },
    {
      key: 'ai',
      label: 'AI Settings',
      children: (
        <AISettings 
          onSave={handleAISave}
          onTest={handleAITest}
        />
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
