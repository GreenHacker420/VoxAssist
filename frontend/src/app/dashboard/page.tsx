'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import CallConfiguration from '@/components/CallConfiguration';
import WhatsAppCalling from '@/components/WhatsAppCalling';
import SelfDemoCall from '@/components/SelfDemoCall';
import { ExclamationTriangleIcon, ArrowUpIcon, ArrowDownIcon, PhoneIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ResponsiveContainer, BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts';
import { AnalyticsService } from '@/services/analytics';
import { DashboardAnalytics } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Utility functions
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function DashboardPage() {
  const { isDemoMode } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await AnalyticsService.getDashboardAnalytics();
        setAnalytics(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      name: 'Total Calls',
      stat: isDemoMode ? 247 : (analytics?.overview?.totalCalls || 0),
      icon: PhoneIcon,
      change: isDemoMode ? 12.3 : calculatePercentageChange(
        analytics?.callVolume?.thisWeek || 0,
        analytics?.callVolume?.lastWeek || 0
      ),
      changeType: 'increase' as const,
    },
    {
      name: 'Resolution Rate',
      stat: isDemoMode ? '94.2%' : formatPercentage(analytics?.overview?.resolutionRate || 0),
      icon: CheckCircleIcon,
      change: isDemoMode ? 2.8 : 2.1,
      changeType: 'increase' as const,
    },
    {
      name: 'Avg Duration',
      stat: isDemoMode ? '3:42' : formatDuration(analytics?.overview?.avgCallDuration || 0),
      icon: ClockIcon,
      change: isDemoMode ? -0.8 : -1.2,
      changeType: 'decrease' as const,
    },
    {
      name: 'Escalated',
      stat: isDemoMode ? 14 : (analytics?.overview?.escalatedCalls || 0),
      icon: ExclamationTriangleIcon,
      change: isDemoMode ? -1.2 : 0.5,
      changeType: isDemoMode ? 'decrease' : 'increase' as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of your voice calling operations and performance metrics.
          </p>
        </div>

        {/* Self Demo Call - Only show in demo mode */}
        {isDemoMode && (
          <SelfDemoCall />
        )}

        {/* Call Configuration using Ant Design */}
        <CallConfiguration
          onStartCall={(config) => {
            console.log('Starting call with config:', config);
            // Handle call initiation
          }}
          onCreateWidget={(config) => {
            console.log('Creating widget with config:', config);
            // Handle widget creation
          }}
        />

        {/* WhatsApp Calling Interface */}
        <WhatsAppCalling 
          onCallInitiated={(phoneNumber: string) => {
            console.log('WhatsApp call initiated to:', phoneNumber);
            // Handle WhatsApp call tracking
          }}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {item.name}
                        {isDemoMode && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Demo</span>}
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{item.stat}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <div className="flex items-center">
                    {item.changeType === 'increase' ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(item.change).toFixed(1)}%
                    </span>
                    <span className="text-gray-500 ml-1">from last week</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Call Volume by Hour
              {isDemoMode && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">Demo Data</span>}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.hourlyDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" fill={isDemoMode ? "#8B5CF6" : "#3B82F6"} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sentiment Trends */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Sentiment Trends
              {isDemoMode && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">Demo Data</span>}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.sentimentTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="neutral" stroke="#6B7280" strokeWidth={2} />
                  <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity {isDemoMode && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">Demo Data</span>}
            </h3>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {[
                  {
                    id: 1,
                    content: isDemoMode ? 'Self-demo call completed successfully' : 'Call completed with high satisfaction score',
                    target: isDemoMode ? 'Demo User (Self)' : 'Customer #1234',
                    href: '#',
                    date: '2 hours ago',
                    datetime: '2023-01-23T15:56',
                    icon: CheckCircleIcon,
                    iconBackground: 'bg-green-500',
                  },
                  {
                    id: 2,
                    content: isDemoMode ? 'WhatsApp demo call initiated' : 'New lead generated from campaign',
                    target: isDemoMode ? 'WhatsApp User +1-555-0123' : 'Campaign: Q1 Outreach',
                    href: '#',
                    date: '4 hours ago',
                    datetime: '2023-01-23T13:23',
                    icon: PhoneIcon,
                    iconBackground: 'bg-blue-500',
                  },
                  {
                    id: 3,
                    content: isDemoMode ? 'Demo call with advanced analysis' : 'Call escalated to human agent',
                    target: isDemoMode ? 'Customer +1-555-0456' : 'Customer #5678',
                    href: '#',
                    date: '6 hours ago',
                    datetime: '2023-01-23T11:03',
                    icon: ExclamationTriangleIcon,
                    iconBackground: isDemoMode ? 'bg-purple-500' : 'bg-yellow-500',
                  },
                ].map((activityItem, activityItemIdx) => (
                  <li key={activityItem.id}>
                    <div className="relative pb-8">
                      {activityItemIdx !== 2 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`${activityItem.iconBackground} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}
                          >
                            <activityItem.icon className="h-5 w-5 text-white" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-500">
                              {activityItem.content}{' '}
                              <a href={activityItem.href} className="font-medium text-gray-900">
                                {activityItem.target}
                              </a>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={activityItem.datetime}>{activityItem.date}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

