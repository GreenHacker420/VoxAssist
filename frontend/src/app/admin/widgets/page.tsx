'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, Eye, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import WidgetCreateDialog, { WidgetConfig } from '@/components/widgets/WidgetCreateDialog';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetsService } from '@/services/widgets';

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
  const { user, isLoading } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, WidgetAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);

  useEffect(() => {
    if (!isLoading) {
      fetchWidgets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user?.organizationId]);

  const fetchWidgets = async () => {
    try {
      const orgId = user?.organizationId;
      if (!orgId) {
        toast.error('Organization context missing');
        setLoading(false);
        return;
      }
      const data = await WidgetsService.list(orgId);
      setWidgets(data as unknown as Widget[]);

      // Batch fetch analytics for all widgets in parallel via service
      const results = await Promise.all(
        (data as unknown as Widget[]).map(async (w) => {
          try {
            const an = await WidgetsService.analytics(w.id);
            return { id: w.id, analytics: an };
          } catch {
            return null;
          }
        })
      );
      const aggregated: Record<string, WidgetAnalytics> = {};
      results.filter(Boolean).forEach((r) => {
        const item = r as { id: string; analytics: WidgetAnalytics };
        aggregated[item.id] = item.analytics;
      });
      setAnalytics(aggregated);
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
    // Map existing Widget to WidgetConfig used by the shared dialog
    const mapped: WidgetConfig = {
      id: widget.id,
      name: widget.name,
      contextUrl: widget.contextUrl,
      appearance: {
        position: (widget.appearance.position as WidgetConfig['appearance']['position']) || 'bottom-right',
        primaryColor: widget.appearance.primaryColor || '#3B82F6',
        secondaryColor: widget.appearance.secondaryColor || '#1E40AF',
        textColor: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        size: 'medium',
      },
      behavior: {
        autoOpen: widget.behavior.autoOpen || false,
        greeting: widget.behavior.greeting || 'Hi! How can I help you today?',
        language: 'en',
        enableVoice: widget.behavior.enableVoice ?? true,
        enableText: true,
      },
      permissions: {
        collectPersonalData: false,
        storeCookies: true,
        recordAudio: widget.behavior.enableVoice ?? true,
        shareWithThirdParty: false,
      },
    };
    setSelectedWidget(mapped);
    setShowCreateModal(true);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      await WidgetsService.remove(widgetId);
      toast.success('Widget deleted successfully');
      fetchWidgets();
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
      await WidgetsService.toggleActive(widget.id, !widget.isActive);
      toast.success(`Widget ${widget.isActive ? 'deactivated' : 'activated'}`);
      fetchWidgets();
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

      {/* Create/Edit Widget Dialog (shared with user) */}
      <WidgetCreateDialog
        open={showCreateModal}
        widget={selectedWidget || undefined}
        organizationId={user?.organizationId}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          fetchWidgets();
        }}
      />
    </div>
  );
}
