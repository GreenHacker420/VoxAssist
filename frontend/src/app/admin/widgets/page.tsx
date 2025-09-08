'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, Eye, Trash2, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface Widget {
  id: string;
  name: string;
  contextUrl?: string;
  isActive: boolean;
  appearance: {
    position: string;
    primaryColor: string;
    secondaryColor: string;
  };
  behavior: {
    autoOpen: boolean;
    greeting: string;
    enableVoice: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface WidgetAnalytics {
  totalSessions: number;
  totalInteractions: number;
  avgSentimentScore: number;
}

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, WidgetAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/widget/configs/1'); // Replace with actual org ID
      if (response.ok) {
        const data = await response.json();
        setWidgets(data);
        
        // Fetch analytics for each widget
        data.forEach(async (widget: Widget) => {
          const analyticsResponse = await fetch(`/api/widget/analytics/${widget.id}`);
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            setAnalytics(prev => ({ ...prev, [widget.id]: analyticsData }));
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
      toast.error('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWidget = () => {
    setSelectedWidget(null);
    setShowCreateModal(true);
  };

  const handleEditWidget = (widget: Widget) => {
    setSelectedWidget(widget);
    setShowCreateModal(true);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      const response = await fetch(`/api/widget/update/${widgetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Widget deleted successfully');
        fetchWidgets();
      } else {
        throw new Error('Failed to delete widget');
      }
    } catch (error) {
      console.error('Delete widget error:', error);
      toast.error('Failed to delete widget');
    }
  };

  const copyWidgetScript = (widget: Widget) => {
    const script = `<script src="${window.location.origin}/static/widget.js" data-context-url="${widget.contextUrl || window.location.origin}"></script>`;
    navigator.clipboard.writeText(script);
    toast.success('Widget script copied to clipboard');
  };

  const toggleWidgetStatus = async (widget: Widget) => {
    try {
      const response = await fetch(`/api/widget/update/${widget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !widget.isActive }),
      });

      if (response.ok) {
        toast.success(`Widget ${widget.isActive ? 'deactivated' : 'activated'}`);
        fetchWidgets();
      } else {
        throw new Error('Failed to update widget status');
      }
    } catch (error) {
      console.error('Toggle widget status error:', error);
      toast.error('Failed to update widget status');
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
          <h1 className="text-2xl font-bold text-gray-900">Voice Chat Widgets</h1>
          <p className="text-gray-600">Manage your embeddable voice chat widgets</p>
        </div>
        <button
          onClick={handleCreateWidget}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Widget
        </button>
      </div>

      {widgets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
          <p className="text-gray-600 mb-4">Create your first voice chat widget to get started</p>
          <button
            onClick={handleCreateWidget}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Widget
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
            <div key={widget.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{widget.name}</h3>
                  <p className="text-sm text-gray-600">{widget.contextUrl || 'No URL set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      widget.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {widget.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Widget Preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: widget.appearance.primaryColor }}
                  ></div>
                  <span className="text-xs text-gray-600">Widget Preview</span>
                </div>
                <div className="text-xs text-gray-700">
                  Position: {widget.appearance.position} | 
                  Voice: {widget.behavior.enableVoice ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              {/* Analytics */}
              {analytics[widget.id] && (
                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {analytics[widget.id].totalSessions}
                    </div>
                    <div className="text-xs text-gray-600">Sessions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {analytics[widget.id].totalInteractions}
                    </div>
                    <div className="text-xs text-gray-600">Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {(analytics[widget.id].avgSentimentScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-600">Sentiment</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyWidgetScript(widget)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 flex items-center justify-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy Script
                </button>
                <button
                  onClick={() => handleEditWidget(widget)}
                  className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <button
                  onClick={() => toggleWidgetStatus(widget)}
                  className={`px-3 py-2 rounded text-sm ${
                    widget.isActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteWidget(widget.id)}
                  className="bg-red-100 text-red-700 px-3 py-2 rounded text-sm hover:bg-red-200"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Widget Modal */}
      {showCreateModal && (
        <WidgetModal
          widget={selectedWidget}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            fetchWidgets();
          }}
        />
      )}
    </div>
  );
}

interface WidgetModalProps {
  widget: Widget | null;
  onClose: () => void;
  onSave: () => void;
}

function WidgetModal({ widget, onClose, onSave }: WidgetModalProps) {
  const [formData, setFormData] = useState({
    name: widget?.name || '',
    contextUrl: widget?.contextUrl || '',
    appearance: {
      position: widget?.appearance.position || 'bottom-right',
      primaryColor: widget?.appearance.primaryColor || '#3B82F6',
      secondaryColor: widget?.appearance.secondaryColor || '#1E40AF',
      textColor: '#FFFFFF',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      size: 'medium'
    },
    behavior: {
      autoOpen: widget?.behavior.autoOpen || false,
      greeting: widget?.behavior.greeting || 'Hi! How can I help you today?',
      language: 'en',
      enableVoice: widget?.behavior.enableVoice ?? false,
      enableText: true
    },
    permissions: {
      collectPersonalData: false,
      storeCookies: true,
      recordAudio: false,
      shareWithThirdParty: false
    }
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Widget name is required');
      return;
    }

    setSaving(true);
    try {
      const url = widget ? `/api/widget/update/${widget.id}` : '/api/widget/create';
      const method = widget ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId: 1 // Replace with actual org ID
        }),
      });

      if (response.ok) {
        toast.success(`Widget ${widget ? 'updated' : 'created'} successfully`);
        onSave();
      } else {
        throw new Error(`Failed to ${widget ? 'update' : 'create'} widget`);
      }
    } catch (error) {
      console.error('Save widget error:', error);
      toast.error(`Failed to ${widget ? 'update' : 'create'} widget`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {widget ? 'Edit Widget' : 'Create New Widget'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Widget Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Website Widget"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.contextUrl}
                  onChange={(e) => setFormData({ ...formData, contextUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={formData.appearance.position}
                  onChange={(e) => setFormData({
                    ...formData,
                    appearance: { ...formData.appearance, position: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <input
                  type="color"
                  value={formData.appearance.primaryColor}
                  onChange={(e) => setFormData({
                    ...formData,
                    appearance: { ...formData.appearance, primaryColor: e.target.value }
                  })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Greeting Message
                </label>
                <textarea
                  value={formData.behavior.greeting}
                  onChange={(e) => setFormData({
                    ...formData,
                    behavior: { ...formData.behavior, greeting: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.behavior.autoOpen}
                    onChange={(e) => setFormData({
                      ...formData,
                      behavior: { ...formData.behavior, autoOpen: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-open widget</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.behavior.enableVoice}
                    onChange={(e) => setFormData({
                      ...formData,
                      behavior: { ...formData.behavior, enableVoice: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable voice chat</span>
                </label>
              </div>
            </div>
          </div>
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
            {saving ? 'Saving...' : (widget ? 'Update Widget' : 'Create Widget')}
          </button>
        </div>
      </div>
    </div>
  );
}
