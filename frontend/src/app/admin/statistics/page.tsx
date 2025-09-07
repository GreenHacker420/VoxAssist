'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { AdminService } from '@/services/admin';
import { 
  ChartBarIcon,
  UsersIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  ServerIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Statistics {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  calls: {
    total: number;
    today: number;
    thisMonth: number;
    avgDuration: number;
    successRate: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  usage: {
    storage: number;
    bandwidth: number;
    apiCalls: number;
  };
}

export default function AdminStatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    loadStatistics();
  }, [period]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      // Using the existing statistics endpoint from admin routes
      const response = await fetch('/api/admin/statistics?period=' + period, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'indigo',
    suffix = '' 
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    color?: string;
    suffix?: string;
  }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                </div>
                {change !== undefined && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change >= 0 ? (
                      <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {change >= 0 ? 'Increased' : 'Decreased'} by
                    </span>
                    {Math.abs(change)}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Statistics</h1>
            <p className="text-gray-600">Comprehensive system performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {statistics && (
          <>
            {/* User Statistics */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">User Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Users"
                  value={statistics.users.total}
                  icon={UsersIcon}
                  color="blue"
                />
                <StatCard
                  title="Active Users"
                  value={statistics.users.active}
                  icon={UsersIcon}
                  color="green"
                />
                <StatCard
                  title="New Users"
                  value={statistics.users.new}
                  change={statistics.users.growth}
                  icon={UsersIcon}
                  color="purple"
                />
                <StatCard
                  title="User Growth"
                  value={statistics.users.growth}
                  suffix="%"
                  icon={ArrowUpIcon}
                  color="indigo"
                />
              </div>
            </div>

            {/* Call Statistics */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Call Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Calls"
                  value={statistics.calls.total}
                  icon={PhoneIcon}
                  color="green"
                />
                <StatCard
                  title="Calls Today"
                  value={statistics.calls.today}
                  icon={PhoneIcon}
                  color="blue"
                />
                <StatCard
                  title="This Month"
                  value={statistics.calls.thisMonth}
                  icon={PhoneIcon}
                  color="purple"
                />
                <StatCard
                  title="Success Rate"
                  value={statistics.calls.successRate}
                  suffix="%"
                  icon={ChartBarIcon}
                  color="green"
                />
              </div>
            </div>

            {/* Revenue Statistics */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                  title="Total Revenue"
                  value={`$${statistics.revenue.total.toLocaleString()}`}
                  icon={CurrencyDollarIcon}
                  color="green"
                />
                <StatCard
                  title="This Month"
                  value={`$${statistics.revenue.thisMonth.toLocaleString()}`}
                  change={statistics.revenue.growth}
                  icon={CurrencyDollarIcon}
                  color="blue"
                />
                <StatCard
                  title="Last Month"
                  value={`$${statistics.revenue.lastMonth.toLocaleString()}`}
                  icon={CurrencyDollarIcon}
                  color="purple"
                />
              </div>
            </div>

            {/* System Usage */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">System Usage</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Storage Used"
                  value={statistics.usage.storage}
                  suffix=" GB"
                  icon={ServerIcon}
                  color="orange"
                />
                <StatCard
                  title="Bandwidth"
                  value={statistics.usage.bandwidth}
                  suffix=" TB"
                  icon={ServerIcon}
                  color="red"
                />
                <StatCard
                  title="API Calls"
                  value={statistics.usage.apiCalls}
                  icon={ServerIcon}
                  color="indigo"
                />
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Average Call Duration</h4>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(statistics.calls.avgDuration / 60)} minutes
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">System Health</h4>
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-900">Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!statistics && !loading && (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No statistics available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Statistics will appear here when data is available.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
