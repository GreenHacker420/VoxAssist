'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import CallConfiguration from '@/components/CallConfiguration';
import WhatsAppCalling from '@/components/WhatsAppCalling';
import SelfDemoCall from '@/components/SelfDemoCall';
import { ExclamationTriangleIcon, ArrowUpIcon, ArrowDownIcon, PhoneIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ResponsiveContainer, BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts';
import { AnalyticsService } from '@/services/analytics';
import { DashboardAnalytics } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Statistic, Row, Col, Tag, Timeline, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined, PhoneOutlined, ExclamationCircleOutlined } from '@ant-design/icons';


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
  const { user } = useAuth();
  const router = useRouter();
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
      stat: analytics?.overview?.totalCalls || 0,
      icon: PhoneIcon,
      change: calculatePercentageChange(
        analytics?.callVolume?.thisWeek || 0,
        analytics?.callVolume?.lastWeek || 0
      ),
      changeType: 'increase' as const,
    },
    {
      name: 'Resolution Rate',
      stat: formatPercentage(analytics?.overview?.resolutionRate || 0),
      icon: CheckCircleIcon,
      change: 2.1,
      changeType: 'increase' as const,
    },
    {
      name: 'Avg Duration',
      stat: formatDuration(analytics?.overview?.avgCallDuration || 0),
      icon: ClockIcon,
      change: -1.2,
      changeType: 'decrease' as const,
    },
    {
      name: 'Escalated',
      stat: analytics?.overview?.escalatedCalls || 0,
      icon: ExclamationTriangleIcon,
      change: 0.5,
      changeType: 'increase' as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Simplified Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Monitor your call performance and analytics
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Unable to load dashboard data</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Demo Components - Simplified Layout */}
        <div className="space-y-6">
          <SelfDemoCall />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CallConfiguration
              onStartCall={(config) => {
                console.log('Starting call with config:', config);
              }}
              onCreateWidget={(config) => {
                console.log('Creating widget with config:', config);
              }}
            />

            <WhatsAppCalling
              onCallInitiated={(phoneNumber: string) => {
                console.log('WhatsApp call initiated to:', phoneNumber);
              }}
            />
          </div>
        </div>

        {/* Simplified Stats Cards */}
        <Row gutter={[24, 24]}>
          {stats.map((item) => (
            <Col key={item.name} xs={24} sm={12} lg={6}>
              <Card className="text-center hover:shadow-md transition-shadow duration-200">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full">
                    <item.icon className="h-6 w-6 text-blue-600" />
                  </div>

                  <div>
                    <Statistic
                      value={item.stat}
                      valueStyle={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#1f2937'
                      }}
                    />
                    <p className="text-sm text-gray-600 mt-1">{item.name}</p>
                  </div>

                  <div className="flex items-center text-sm">
                    {item.changeType === 'increase' ? (
                      <ArrowUpOutlined className="text-green-500 mr-1" />
                    ) : (
                      <ArrowDownOutlined className="text-red-500 mr-1" />
                    )}
                    <span className={`font-medium ${
                      item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(item.change).toFixed(1)}%
                    </span>
                    <span className="text-gray-500 ml-1">vs last week</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Simplified Charts Section */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Call Volume by Hour" className="h-full">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.hourlyDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Sentiment Trends" className="h-full">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.sentimentTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="neutral" stroke="#6B7280" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Enhanced Recent Activity with Timeline */}
        <Card
          title={
            <div className="flex items-center">
              <span>Recent Activity</span>
            </div>
          }
          className="shadow-sm"
        >
          <Timeline
            items={[
              {
                dot: <CheckCircleOutlined style={{ fontSize: '16px', color: '#10b981' }} />,
                children: (
                  <div>
                    <div className="text-sm text-gray-900 font-medium">
                      Call completed with high satisfaction score
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Customer #1234 • 2 hours ago
                    </div>
                  </div>
                ),
                color: 'green',
              },
              {
                dot: <PhoneOutlined style={{ fontSize: '16px', color: '#3b82f6' }} />,
                children: (
                  <div>
                    <div className="text-sm text-gray-900 font-medium">
                      New lead generated from campaign
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Campaign: Q1 Outreach • 4 hours ago
                    </div>
                  </div>
                ),
                color: 'blue',
              },
              {
                dot: <ExclamationCircleOutlined style={{ fontSize: '16px', color: '#f59e0b' }} />,
                children: (
                  <div>
                    <div className="text-sm text-gray-900 font-medium">
                      Call escalated to human agent
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Customer #5678 • 6 hours ago
                    </div>
                  </div>
                ),
                color: 'orange',
              },
            ]}
          />
        </Card>

        {/* Enhanced Widgets Preview */}
        {user && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Voice Chat Widgets</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Your embeddable voice chat widgets with real-time analytics
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push('/widgets/create')}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Widget
                </button>
                <button
                  onClick={() => router.push('/widgets')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View All Widgets
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Main Website Widget</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Primary voice chat widget for homepage</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">1.2k</div>
                    <div className="text-xs text-gray-500">Interactions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">23%</div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">4:05</div>
                    <div className="text-xs text-gray-500">Avg Session</div>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Support Page Widget</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Specialized widget for customer support</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">856</div>
                    <div className="text-xs text-gray-500">Interactions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">31%</div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">3:22</div>
                    <div className="text-xs text-gray-500">Avg Session</div>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Product Demo Widget</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Testing
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Widget for product demonstration pages</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">342</div>
                    <div className="text-xs text-gray-500">Interactions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">18%</div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">2:45</div>
                    <div className="text-xs text-gray-500">Avg Session</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

