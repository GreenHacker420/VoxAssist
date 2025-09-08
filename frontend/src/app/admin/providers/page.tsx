'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, Phone, MessageSquare, Trash2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProviderConfig {
  id: string;
  name: string;
  type: 'phone' | 'whatsapp';
  provider: string;
  isActive: boolean;
  isPrimary: boolean;
  settings: Record<string, any>;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportedProvider {
  name: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
    recording: boolean;
    streaming: boolean;
    conferencing: boolean;
    regions: string[];
  };
  pricing: {
    voice?: { inbound: number; outbound: number };
    sms?: { inbound: number; outbound: number };
    whatsapp?: { inbound: number; outbound: number };
  };
  requirements: {
    credentials: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
    }>;
    settings: Array<{
      name: string;
      label: string;
      type: string;
      default?: any;
    }>;
  };
}

export default function ProvidersPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [supportedProviders, setSupportedProviders] = useState<SupportedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ProviderConfig | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchConfigs();
    fetchSupportedProviders();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/providers/configs/1'); // Replace with actual org ID
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Failed to fetch provider configs:', error);
      toast.error('Failed to load provider configurations');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportedProviders = async () => {
    try {
      const response = await fetch('/api/providers/supported');
      if (response.ok) {
        const data = await response.json();
        setSupportedProviders(data);
      }
    } catch (error) {
      console.error('Failed to fetch supported providers:', error);
    }
  };

  const handleCreateConfig = () => {
    setSelectedConfig(null);
    setShowCreateModal(true);
  };

  const handleEditConfig = (config: ProviderConfig) => {
    setSelectedConfig(config);
    setShowCreateModal(true);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this provider configuration?')) return;

    try {
      const response = await fetch(`/api/providers/configs/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Provider configuration deleted successfully');
        fetchConfigs();
      } else {
        throw new Error('Failed to delete provider configuration');
      }
    } catch (error) {
      console.error('Delete provider config error:', error);
      toast.error('Failed to delete provider configuration');
    }
  };

  const handleTestConnection = async (configId: string) => {
    try {
      setTestResults({ ...testResults, [configId]: { testing: true } });
      
      const response = await fetch(`/api/providers/test/${configId}`, {
        method: 'POST',
      });

      const result = await response.json();
      setTestResults({ ...testResults, [configId]: result });

      if (result.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('Failed to test connection');
      setTestResults({ ...testResults, [configId]: { success: false, error: 'Test failed' } });
    }
  };

  const toggleConfigStatus = async (config: ProviderConfig) => {
    try {
      const response = await fetch(`/api/providers/configs/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !config.isActive }),
      });

      if (response.ok) {
        toast.success(`Provider ${config.isActive ? 'deactivated' : 'activated'}`);
        fetchConfigs();
      } else {
        throw new Error('Failed to update provider status');
      }
    } catch (error) {
      console.error('Toggle provider status error:', error);
      toast.error('Failed to update provider status');
    }
  };

  const setPrimaryProvider = async (config: ProviderConfig) => {
    try {
      const response = await fetch(`/api/providers/configs/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (response.ok) {
        toast.success('Primary provider updated');
        fetchConfigs();
      } else {
        throw new Error('Failed to set primary provider');
      }
    } catch (error) {
      console.error('Set primary provider error:', error);
      toast.error('Failed to set primary provider');
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'twilio':
        return 'bg-red-100 text-red-800';
      case 'plivo':
        return 'bg-blue-100 text-blue-800';
      case 'ringg':
        return 'bg-green-100 text-green-800';
      case 'sarvam':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provider Configurations</h1>
          <p className="text-gray-600">Manage your calling and messaging service providers</p>
        </div>
        <button
          onClick={handleCreateConfig}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {/* Provider Types Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['phone', 'whatsapp'].map((type) => {
          const typeConfigs = configs.filter(c => c.type === type);
          const primaryConfig = typeConfigs.find(c => c.isPrimary);
          
          return (
            <div key={type} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                {getProviderIcon(type)}
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {type === 'whatsapp' ? 'WhatsApp' : 'Phone'} Calling
                </h3>
              </div>
              
              {primaryConfig ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Primary Provider</p>
                    <p className="font-medium text-gray-900">
                      {primaryConfig.name} ({primaryConfig.provider})
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    primaryConfig.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {primaryConfig.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No primary provider configured
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Provider Configurations List */}
      {configs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No providers configured</h3>
          <p className="text-gray-600 mb-4">Add your first provider to start making calls</p>
          <button
            onClick={handleCreateConfig}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Provider
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Configurations</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {configs.map((config) => (
              <div key={config.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(config.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{config.name}</h4>
                          {config.isPrimary && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProviderBadgeColor(config.provider)}`}>
                            {config.provider.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600 capitalize">{config.type}</span>
                          {testResults[config.id] && (
                            <div className="flex items-center gap-1">
                              {testResults[config.id].testing ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                              ) : testResults[config.id].success ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-600" />
                              )}
                              <span className="text-xs text-gray-500">
                                {testResults[config.id].testing ? 'Testing...' : 
                                 testResults[config.id].success ? 'Connected' : 'Failed'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestConnection(config.id)}
                      disabled={testResults[config.id]?.testing}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50"
                    >
                      <TestTube className="w-3 h-3" />
                      Test
                    </button>
                    
                    {!config.isPrimary && (
                      <button
                        onClick={() => setPrimaryProvider(config)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                      >
                        Set Primary
                      </button>
                    )}
                    
                    <button
                      onClick={() => toggleConfigStatus(config)}
                      className={`px-3 py-1 rounded text-sm ${
                        config.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {config.isActive ? 'Disable' : 'Enable'}
                    </button>
                    
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Provider Modal */}
      {showCreateModal && (
        <ProviderModal
          config={selectedConfig}
          supportedProviders={supportedProviders}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            fetchConfigs();
          }}
        />
      )}
    </div>
  );
}

interface ProviderModalProps {
  config: ProviderConfig | null;
  supportedProviders: SupportedProvider[];
  onClose: () => void;
  onSave: () => void;
}

function ProviderModal({ config, supportedProviders, onClose, onSave }: ProviderModalProps) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    type: config?.type || 'phone',
    provider: config?.provider || 'twilio',
    credentials: {} as Record<string, string>,
    settings: config?.settings || {},
    isPrimary: config?.isPrimary || false
  });

  const [saving, setSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider | null>(
    supportedProviders.find(p => p.name === formData.provider) || supportedProviders[0] || null
  );

  useEffect(() => {
    const provider = supportedProviders.find(p => p.name === formData.provider);
    setSelectedProvider(provider || null);
    
    if (provider && !config) {
      // Initialize default settings for new configs
      const defaultSettings = {};
      provider.requirements.settings.forEach(setting => {
        if (setting.default !== undefined) {
          (defaultSettings as Record<string, any>)[setting.name] = setting.default;
        }
      });
      setFormData(prev => ({ ...prev, settings: defaultSettings }));
    }
  }, [formData.provider, supportedProviders, config]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Configuration name is required');
      return;
    }

    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    // Validate required credentials
    const missingCredentials = selectedProvider.requirements.credentials
      .filter(cred => cred.required && !formData.credentials[cred.name])
      .map(cred => cred.label);

    if (missingCredentials.length > 0) {
      toast.error(`Missing required credentials: ${missingCredentials.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const url = config ? `/api/providers/configs/${config.id}` : '/api/providers/configs';
      const method = config ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId: 1 // Replace with actual org ID
        }),
      });

      if (response.ok) {
        toast.success(`Provider ${config ? 'updated' : 'created'} successfully`);
        onSave();
      } else {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${config ? 'update' : 'create'} provider`);
      }
    } catch (error: any) {
      console.error('Save provider error:', error);
      toast.error(error.message || `Failed to ${config ? 'update' : 'create'} provider`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {config ? 'Edit Provider' : 'Add New Provider'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Twilio Config"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'phone' | 'whatsapp' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="phone">Phone Calls</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {supportedProviders.map((provider) => (
                  <option key={provider.name} value={provider.name}>
                    {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Set as primary provider for {formData.type}
                </span>
              </label>
            </div>
          </div>

          {/* Credentials */}
          {selectedProvider && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Credentials</h3>
              <div className="space-y-4">
                {selectedProvider.requirements.credentials.map((cred) => (
                  <div key={cred.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {cred.label}
                      {cred.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type={cred.type === 'password' ? 'password' : 'text'}
                      value={formData.credentials[cred.name] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, [cred.name]: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter your ${cred.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {selectedProvider && selectedProvider.requirements.settings.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
              <div className="space-y-4">
                {selectedProvider.requirements.settings.map((setting) => (
                  <div key={setting.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {setting.label}
                    </label>
                    {setting.type === 'boolean' ? (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.settings[setting.name] || setting.default || false}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, [setting.name]: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{setting.label}</span>
                      </label>
                    ) : setting.type === 'number' ? (
                      <input
                        type="number"
                        value={formData.settings[setting.name] || setting.default || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, [setting.name]: parseInt(e.target.value) }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.settings[setting.name] || setting.default || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, [setting.name]: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (config ? 'Update Provider' : 'Add Provider')}
          </button>
        </div>
      </div>
    </div>
  );
}
