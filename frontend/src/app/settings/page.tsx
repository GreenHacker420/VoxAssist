'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationSettings } from '@/types';
import {
  CogIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  MicrophoneIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Profile', href: '#profile', icon: UserIcon, current: true },
  { name: 'Organization', href: '#organization', icon: CogIcon, current: false },
  { name: 'Voice Settings', href: '#voice', icon: MicrophoneIcon, current: false },
  { name: 'AI Settings', href: '#ai', icon: ComputerDesktopIcon, current: false },
  { name: 'Notifications', href: '#notifications', icon: BellIcon, current: false },
  { name: 'Security', href: '#security', icon: ShieldCheckIcon, current: false },
  { name: 'Integrations', href: '#integrations', icon: GlobeAltIcon, current: false },
];

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({
    name: 'VoxAssist Demo',
    timezone: 'America/New_York',
    businessHours: {
      start: '09:00',
      end: '17:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    voiceSettings: {
      voice: 'alloy',
      speed: 1.0,
      pitch: 1.0,
    },
    aiSettings: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile(profileData);
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-500">
          Update your personal information and account settings.
        </p>
      </div>

      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderVoiceTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">Voice Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure AI voice parameters for your calls.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-gray-700">
            Voice Model
          </label>
          <select
            id="voice"
            name="voice"
            value={orgSettings.voiceSettings?.voice}
            onChange={(e) => setOrgSettings({
              ...orgSettings,
              voiceSettings: { ...orgSettings.voiceSettings!, voice: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="alloy">Alloy (Neutral)</option>
            <option value="echo">Echo (Male)</option>
            <option value="fable">Fable (British)</option>
            <option value="onyx">Onyx (Deep)</option>
            <option value="nova">Nova (Female)</option>
            <option value="shimmer">Shimmer (Soft)</option>
          </select>
        </div>

        <div>
          <label htmlFor="speed" className="block text-sm font-medium text-gray-700">
            Speech Speed: {orgSettings.voiceSettings?.speed}x
          </label>
          <input
            type="range"
            id="speed"
            name="speed"
            min="0.25"
            max="4.0"
            step="0.25"
            value={orgSettings.voiceSettings?.speed}
            onChange={(e) => setOrgSettings({
              ...orgSettings,
              voiceSettings: { ...orgSettings.voiceSettings!, speed: parseFloat(e.target.value) }
            })}
            className="mt-1 block w-full"
          />
        </div>

        <div>
          <label htmlFor="pitch" className="block text-sm font-medium text-gray-700">
            Pitch: {orgSettings.voiceSettings?.pitch}x
          </label>
          <input
            type="range"
            id="pitch"
            name="pitch"
            min="0.5"
            max="2.0"
            step="0.1"
            value={orgSettings.voiceSettings?.pitch}
            onChange={(e) => setOrgSettings({
              ...orgSettings,
              voiceSettings: { ...orgSettings.voiceSettings!, pitch: parseFloat(e.target.value) }
            })}
            className="mt-1 block w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderAITab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">AI Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure AI model parameters and behavior.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
            AI Model
          </label>
          <select
            id="model"
            name="model"
            value={orgSettings.aiSettings?.model}
            onChange={(e) => setOrgSettings({
              ...orgSettings,
              aiSettings: { ...orgSettings.aiSettings!, model: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="gpt-4">GPT-4 (Recommended)</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3">Claude 3</option>
          </select>
        </div>

        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
            Temperature (Creativity): {orgSettings.aiSettings?.temperature}
          </label>
          <input
            type="range"
            id="temperature"
            name="temperature"
            min="0"
            max="1"
            step="0.1"
            value={orgSettings.aiSettings?.temperature}
            onChange={(e) => setOrgSettings({
              ...orgSettings,
              aiSettings: { ...orgSettings.aiSettings!, temperature: parseFloat(e.target.value) }
            })}
            className="mt-1 block w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative</span>
            <span>Creative</span>
          </div>
        </div>

        <div>
          <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700">
            Max Response Length
          </label>
          <input
            type="number"
            id="maxTokens"
            name="maxTokens"
            min="100"
            max="4000"
            value={orgSettings.aiSettings?.maxTokens}
            onChange={(e) => setOrgSettings({
              ...orgSettings,
              aiSettings: { ...orgSettings.aiSettings!, maxTokens: parseInt(e.target.value) }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'voice':
        return renderVoiceTab();
      case 'ai':
        return renderAITab();
      case 'organization':
        return (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Organization Settings</h3>
            <p className="mt-1 text-sm text-gray-500">Coming soon...</p>
          </div>
        );
      default:
        return (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Settings</h3>
            <p className="mt-1 text-sm text-gray-500">This section is under development.</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <nav className="space-y-1" aria-label="Sidebar">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.href.replace('#', ''))}
                  className={cn(
                    activeTab === tab.href.replace('#', '')
                      ? 'bg-gray-50 text-indigo-700 border-indigo-500'
                      : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50 border-transparent',
                    'group w-full flex items-center pl-2 py-2 text-sm font-medium border-l-4'
                  )}
                >
                  <tab.icon
                    className={cn(
                      activeTab === tab.href.replace('#', '')
                        ? 'text-indigo-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="lg:w-3/4">
            <div className="bg-white shadow rounded-lg p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
