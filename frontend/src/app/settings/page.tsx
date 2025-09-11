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
      const response = await fetch('/api/settings/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save provider configuration');
      }
      
      message.success('Provider settings saved successfully');
    } catch (error) {
      console.error('Failed to save provider settings:', error);
      message.error('Failed to save provider settings');
    }
  };

  const handleProviderTest = async (config: unknown): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings/providers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Provider test failed');
      }
      
      const result = await response.json();
      message.success('Provider connection test successful');
      return result.success;
    } catch (error) {
      console.error('Provider connection test failed:', error);
      message.error('Provider connection test failed');
      return false;
    }
  };

  const handleAISave = async (config: unknown) => {
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save AI configuration');
      }
      
      message.success('AI settings saved successfully');
    } catch (error) {
      console.error('Failed to save AI config:', error);
      message.error('Failed to save AI settings');
    }
  };

  const handleAITest = async (config: unknown): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('AI test failed');
      }
      
      const result = await response.json();
      message.success('AI configuration test successful');
      return result.success;
    } catch (error) {
      console.error('Failed to test AI config:', error);
      message.error('AI configuration test failed');
      return false;
    }
  };

  const handleVoiceSave = async (config: unknown) => {
    try {
      const response = await fetch('/api/settings/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save voice configuration');
      }
      
      message.success('Voice settings saved successfully');
    } catch (error) {
      console.error('Failed to save voice config:', error);
      message.error('Failed to save voice settings');
    }
  };

  const handleVoiceTest = async (config: unknown, text: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings/voice/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ config, text })
      });
      
      if (!response.ok) {
        throw new Error('Voice test failed');
      }
      
      const result = await response.json();
      message.success('Voice test completed successfully');
      return result.success;
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
