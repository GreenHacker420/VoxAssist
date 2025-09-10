'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { WebhooksService, Webhook, WebhookLog } from '@/services/webhooks';
import { formatDate } from '@/lib/utils';
import { 
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { App } from 'antd';

export default function WebhooksPage() {
  const { message } = App.useApp();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'logs'>('webhooks');

  useEffect(() => {
    loadWebhooks();
    loadAvailableEvents();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await WebhooksService.getWebhooks();
      setWebhooks(data);
    } catch (_error) {
      console.error('Error creating webhook:', _error);
      message.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEvents = async () => {
    try {
      await WebhooksService.getAvailableEvents();
    } catch (_error) {
      console.error('Error loading available events:', _error);
    }
  };

  const loadWebhookLogs = async (webhookId: string) => {
    try {
      const response = await WebhooksService.getWebhookLogs(webhookId);
      setWebhookLogs(response.logs);
    } catch (error) {
      console.error('Error loading webhook logs:', error);
      message.error('Failed to load webhook logs');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCreateWebhook = async ({ url, events, description }: { url: string; events: string[]; description?: string; }) => {
    try {
      await WebhooksService.createWebhook({
        url,
        events,
        description: description || '',
        isActive: true,
        secret: ''
      });
      message.success('Webhook created successfully');
      loadWebhooks();
    } catch {
      message.error('Failed to create webhook');
    }
  };

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await WebhooksService.toggleWebhook(webhookId, isActive);
      message.success(`Webhook ${isActive ? 'enabled' : 'disabled'} successfully`);
      loadWebhooks();
    } catch {
      message.error(`Failed to ${isActive ? 'enable' : 'disable'} webhook`);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await WebhooksService.deleteWebhook(webhookId);
      message.success('Webhook deleted successfully');
      loadWebhooks();
      if (selectedWebhook?.id === webhookId) {
        setSelectedWebhook(null);
      }
    } catch {
      message.error('Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const result = await WebhooksService.testWebhook(webhookId, { test: true });
      if (result.success) {
        message.success('Webhook test successful');
      } else {
        message.error(`Webhook test failed: ${result.errorMessage}`);
      }
    } catch {
      message.error('Failed to test webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'retrying':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure webhooks to receive real-time notifications about events
            </p>
          </div>
          <button
            onClick={() => message.success('Webhook creation modal coming soon')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Webhook</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'webhooks', name: 'Webhooks' },
              { id: 'logs', name: 'Logs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'webhooks' | 'logs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'webhooks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Webhooks List */}
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className={`bg-white shadow rounded-lg p-6 cursor-pointer border-2 ${
                    selectedWebhook?.id === webhook.id ? 'border-indigo-500' : 'border-transparent'
                  }`}
                  onClick={() => {
                    setSelectedWebhook(webhook);
                    loadWebhookLogs(webhook.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {webhook.url}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          webhook.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-gray-500 mb-2">{webhook.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <span key={event} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{webhook.events.length - 3} more
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Created {formatDate(webhook.createdAt)}
                        {webhook.lastTriggered && ` • Last triggered ${formatDate(webhook.lastTriggered)}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWebhook(webhook.id, !webhook.isActive);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {webhook.isActive ? (
                          <PauseIcon className="h-5 w-5" />
                        ) : (
                          <PlayIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestWebhook(webhook.id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChartBarIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWebhook(webhook.id);
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {webhooks.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new webhook.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => message.success('Webhook creation modal coming soon')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      Create Webhook
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Webhook Details */}
            {selectedWebhook && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Webhook Details</h3>
                  <button
                    onClick={() => copyToClipboard(selectedWebhook.secret)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">URL</label>
                    <p className="mt-1 text-sm text-gray-900 break-all">{selectedWebhook.url}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Secret</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                        {selectedWebhook.secret.substring(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedWebhook.secret)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Events</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedWebhook.events.map((event) => (
                        <span key={event} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedWebhook.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Description</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedWebhook.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block font-medium text-gray-500">Created</label>
                      <p className="text-gray-900">{formatDate(selectedWebhook.createdAt)}</p>
                    </div>
                    <div>
                      <label className="block font-medium text-gray-500">Last Updated</label>
                      <p className="text-gray-900">{formatDate(selectedWebhook.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && selectedWebhook && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Webhook Logs - {selectedWebhook.url}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {webhookLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.event}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(log.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                          {log.httpStatus && (
                            <span className="text-xs text-gray-500">({log.httpStatus})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.responseTime ? `${log.responseTime}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
