'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/UserLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsGrid from '@/components/dashboard/StatsGrid';
import WidgetsList from '@/components/dashboard/WidgetsList';
import RecentActivity from '@/components/dashboard/RecentActivity';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState([]);

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

    return () => clearTimeout(timer);
  }, []);

  const handleCreateWidget = () => {
    router.push('/widgets/create');
  };

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
      </UserLayout>
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
      </UserLayout>
    );
  }

  const stats = [
    {
      name: 'Total Calls',
      stat: analytics?.overview.totalCalls || 0,
      icon: PhoneIcon,
      change: calculatePercentageChange(
        analytics?.callVolume.thisWeek || 0,
        analytics?.callVolume.lastWeek || 0
      ),
      changeType: (analytics?.callVolume.thisWeek || 0) >= (analytics?.callVolume.lastWeek || 0) ? 'increase' : 'decrease',
    },
    {
      name: 'Resolution Rate',
      stat: formatPercentage(analytics?.overview.resolutionRate || 0),
      icon: CheckCircleIcon,
      change: 2.1,
      changeType: 'increase' as const,
    },
    {
      name: 'Avg Duration',
      stat: formatDuration(analytics?.overview.avgCallDuration || 0),
      icon: ClockIcon,
      change: -1.2,
      changeType: 'decrease' as const,
    },
    {
      name: 'Escalated',
      stat: analytics?.overview.escalatedCalls || 0,
      icon: ExclamationTriangleIcon,
      change: 0.5,
      changeType: 'increase' as const,
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
                      <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                      <dd>
                        <div className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{item.stat}</div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold">
                            {item.changeType === 'increase' ? (
                              <ArrowUpIcon className="self-center flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                            ) : (
                              <ArrowDownIcon className="self-center flex-shrink-0 h-5 w-5 text-red-500" aria-hidden="true" />
                            )}
                            <span className={item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}>
                              {Math.abs(item.change).toFixed(1)}%
                            </span>
                            <span className="text-gray-500 ml-1">vs last week</span>
                          </div>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Call Volume Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Call Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.hourlyDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `${value}:00`}
                    formatter={(value) => [value, 'Calls']}
                  />
                  <Bar dataKey="calls" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sentiment Trends */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.sentimentTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="positive" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Positive"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="neutral" 
                    stroke="#6B7280" 
                    strokeWidth={2}
                    name="Neutral"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="negative" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Negative"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {[
                  {
                    id: 1,
                    content: 'Call completed with high satisfaction score',
                    target: 'Customer #1234',
                    href: '#',
                    date: '2 hours ago',
                    datetime: '2023-01-23T15:56',
                    icon: CheckCircleIcon,
                    iconBackground: 'bg-green-500',
                  },
                  {
                    id: 2,
                    content: 'New lead generated from campaign',
                    target: 'Campaign: Q1 Outreach',
                    href: '#',
                    date: '4 hours ago',
                    datetime: '2023-01-23T13:23',
                    icon: PhoneIcon,
                    iconBackground: 'bg-blue-500',
                  },
                  {
                    id: 3,
                    content: 'Call escalated to human agent',
                    target: 'Customer #5678',
                    href: '#',
                    date: '6 hours ago',
                    datetime: '2023-01-23T11:03',
                    icon: ExclamationTriangleIcon,
                    iconBackground: 'bg-yellow-500',
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
    </UserLayout>
  );
}
