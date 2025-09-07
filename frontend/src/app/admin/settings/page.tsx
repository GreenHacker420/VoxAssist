'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { AdminService } from '@/services/admin';
import { AdminSettings } from '@/types';
import { 
  CogIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: AdminSettings) => {
    setEditingId(setting.id);
    setEditValue(setting.value);
  };

  const handleSave = async (settingId: string) => {
    try {
      await AdminService.updateSetting(settingId, editValue);
      setEditingId(null);
      setEditValue('');
      await loadSettings();
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const getSettingsByCategory = () => {
    const categories: { [key: string]: AdminSettings[] } = {};
    settings.forEach(setting => {
      if (!categories[setting.category]) {
        categories[setting.category] = [];
      }
      categories[setting.category].push(setting);
    });
    return categories;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const settingsByCategory = getSettingsByCategory();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600">Manage system configuration and preferences</p>
          </div>
          <div className="flex items-center space-x-2">
            <CogIcon className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        {/* Settings by Category */}
        <div className="space-y-8">
          {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
            <div key={category} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 capitalize">
                  {category.replace('_', ' ')}
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {categorySettings.map((setting) => (
                  <div key={setting.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {setting.description}
                        </p>
                        <div className="mt-2">
                          {editingId === setting.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 min-w-0 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <button
                                onClick={() => handleSave(setting.id)}
                                className="inline-flex items-center p-1 border border-transparent rounded-md text-green-600 hover:bg-green-50"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="inline-flex items-center p-1 border border-transparent rounded-md text-red-600 hover:bg-red-50"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                                {setting.value}
                              </span>
                              <button
                                onClick={() => handleEdit(setting)}
                                className="inline-flex items-center p-1 border border-transparent rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Last updated: {new Date(setting.updatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {settings.length === 0 && (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No settings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              System settings will appear here when available.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
