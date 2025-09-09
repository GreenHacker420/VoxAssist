'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { AnalyticsService } from '@/services/analytics';
import { DashboardAnalytics } from '@/types';
import { formatDuration, formatPercentage } from '@/lib/utils';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Button,
  Typography,
  Space,
  Spin,
  Alert,
  DatePicker,
  message
} from 'antd';
import {
  BarChartOutlined,
  DownloadOutlined,
  CalendarOutlined,
  TrophyOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');

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
  }, [dateRange]);

  const exportData = async (type: string) => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const blob = await AnalyticsService.exportAnalytics(type, startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `voxassist-${type}-analytics.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export analytics data');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Spin size="large" className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Title level={3}>Loading analytics...</Title>
          </div>
        </Spin>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert
          message="Error Loading Analytics"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  const sentimentData = [
    { name: 'Positive', value: 65, color: '#10B981' },
    { name: 'Neutral', value: 25, color: '#6B7280' },
    { name: 'Negative', value: 10, color: '#EF4444' },
  ];

  const performanceData = [
    { metric: 'Resolution Rate', value: 85, target: 90 },
    { metric: 'Avg Response Time', value: 2.3, target: 2.0 },
    { metric: 'Customer Satisfaction', value: 4.2, target: 4.5 },
    { metric: 'First Call Resolution', value: 78, target: 80 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Title level={2}>Analytics</Title>
            <Text type="secondary">Comprehensive insights into your voice calling operations.</Text>
          </div>
          <Space>
            <Select
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 150 }}
              options={[
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
              ]}
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportData('dashboard')}
            >
              Export
            </Button>
          </Space>
        </div>

        <Space direction="vertical" size="large" className="w-full">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChartOutlined className="text-xl text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {analytics?.overview.totalCalls || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrophyOutlined className="text-xl text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Resolution Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatPercentage(analytics?.overview.resolutionRate || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockCircleOutlined className="text-xl text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Duration</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatDuration(analytics?.overview.avgCallDuration || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PhoneOutlined className="text-xl text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Escalated</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {analytics?.overview.escalatedCalls || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Call Volume Trend */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Call Volume Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.sentimentTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="positive" 
                    stackId="1"
                    stroke="#4F46E5" 
                    fill="#4F46E5"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name?: string; percent?: number }) => `${props.name || ''} ${props.percent ? (props.percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly Distribution */}
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

          {/* Performance Metrics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance vs Targets</h3>
            <div className="space-y-4">
              {performanceData.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm font-medium text-gray-900">
                    <span>{item.metric}</span>
                    <span>{item.value}{item.metric.includes('Rate') || item.metric.includes('Resolution') ? '%' : item.metric.includes('Time') ? 's' : ''}</span>
                  </div>
                  <div className="mt-1 relative">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div
                        style={{ width: `${Math.min((item.value / item.target) * 100, 100)}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          item.value >= item.target ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>Target: {item.target}{item.metric.includes('Rate') || item.metric.includes('Resolution') ? '%' : item.metric.includes('Time') ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Analytics Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Metrics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Today
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yesterday
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      This Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Week
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Total Calls
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analytics?.callVolume.today || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analytics?.callVolume.yesterday || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analytics?.callVolume.thisWeek || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analytics?.callVolume.lastWeek || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Resolution Rate
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      85%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      87%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      86%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      84%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Avg Duration
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2:45
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2:52
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2:48
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2:55
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </Space>
      </div>
    </DashboardLayout>
  );
}
