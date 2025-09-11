'use client';

import { useState } from 'react';
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function WhatsAppAnalytics() {
  const [analytics] = useState({
    totalMessages: 1247,
    deliveredMessages: 1198,
    readMessages: 1089,
    failedMessages: 49,
    averageResponseTime: 142,
    activeConversations: 23,
    totalCalls: 247,
    successfulCalls: 233,
    failedCalls: 14,
    averageCallDuration: 185,
    messagesByHour: [
      { hour: '00:00', messages: 12 },
      { hour: '01:00', messages: 8 },
      { hour: '02:00', messages: 5 },
      { hour: '03:00', messages: 3 },
      { hour: '04:00', messages: 7 },
      { hour: '05:00', messages: 15 },
      { hour: '06:00', messages: 28 },
      { hour: '07:00', messages: 45 },
      { hour: '08:00', messages: 67 },
      { hour: '09:00', messages: 89 },
      { hour: '10:00', messages: 102 },
      { hour: '11:00', messages: 95 },
      { hour: '12:00', messages: 87 },
      { hour: '13:00', messages: 76 },
      { hour: '14:00', messages: 82 },
      { hour: '15:00', messages: 94 },
      { hour: '16:00', messages: 88 },
      { hour: '17:00', messages: 79 },
      { hour: '18:00', messages: 65 },
      { hour: '19:00', messages: 52 },
      { hour: '20:00', messages: 38 },
      { hour: '21:00', messages: 29 },
      { hour: '22:00', messages: 21 },
      { hour: '23:00', messages: 16 }
    ],
    messageTypes: [
      { name: 'Text', value: 856, color: '#10B981' },
      { name: 'Media', value: 234, color: '#3B82F6' },
      { name: 'Document', value: 89, color: '#8B5CF6' },
      { name: 'Location', value: 68, color: '#F59E0B' }
    ],
    callsByHour: [
      { hour: '00:00', calls: 3 },
      { hour: '01:00', calls: 2 },
      { hour: '02:00', calls: 1 },
      { hour: '03:00', calls: 1 },
      { hour: '04:00', calls: 2 },
      { hour: '05:00', calls: 4 },
      { hour: '06:00', calls: 8 },
      { hour: '07:00', calls: 12 },
      { hour: '08:00', calls: 18 },
      { hour: '09:00', calls: 25 },
      { hour: '10:00', calls: 28 },
      { hour: '11:00', calls: 24 },
      { hour: '12:00', calls: 22 },
      { hour: '13:00', calls: 20 },
      { hour: '14:00', calls: 23 },
      { hour: '15:00', calls: 26 },
      { hour: '16:00', calls: 21 },
      { hour: '17:00', calls: 19 },
      { hour: '18:00', calls: 16 },
      { hour: '19:00', calls: 13 },
      { hour: '20:00', calls: 10 },
      { hour: '21:00', calls: 8 },
      { hour: '22:00', calls: 5 },
      { hour: '23:00', calls: 4 }
    ],
    callOutcomes: [
      { outcome: 'Resolved', count: 186, percentage: 75.3 },
      { outcome: 'Escalated', count: 33, percentage: 13.4 },
      { outcome: 'Callback Requested', count: 14, percentage: 5.7 },
      { outcome: 'Failed', count: 14, percentage: 5.7 }
    ]
  });
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getSuccessRate = () => {
    return (analytics.successfulCalls / analytics.totalCalls) * 100;
  };

  const getFailureRate = () => {
    return (analytics.failedCalls / analytics.totalCalls) * 100;
  };

  const outcomeColors = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">WhatsApp Calling Analytics</h2>
          <p className="text-gray-600 mt-1">
            Monitor your WhatsApp Business API calling performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <PhoneIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalCalls.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                +12.5% from last period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPercentage(getSuccessRate())}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {analytics.successfulCalls} successful calls
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatDuration(analytics.averageCallDuration)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Per successful call
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed Calls</p>
              <p className="text-2xl font-bold text-red-600">
                {analytics.failedCalls}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatPercentage(getFailureRate())} failure rate
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Call Distribution */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Call Volume by Hour
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              WhatsApp
            </span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.callsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 12 }}
                  interval={2}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, 'Calls']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Bar dataKey="calls" fill="#25D366" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Outcomes */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Call Outcomes
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Resolution Analysis
            </span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.callOutcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {analytics.callOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={outcomeColors[index % outcomeColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: { payload?: { percentage?: number; outcome?: string } }) => [
                    `${value} calls (${props?.payload?.percentage || 0}%)`,
                    props?.payload?.outcome || name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {analytics.callOutcomes.map((outcome, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: outcomeColors[index % outcomeColors.length] }}
                />
                <span className="text-sm text-gray-600">
                  {outcome.outcome} ({outcome.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent WhatsApp Call Activity</h3>
        <div className="space-y-4">
          {[
            {
              id: 1,
              phoneNumber: '+1-555-0123',
              action: 'Call initiated',
              status: 'delivered',
              time: '2 minutes ago',
              duration: null,
              statusColor: 'text-blue-600'
            },
            {
              id: 2,
              phoneNumber: '+1-555-0456',
              action: 'Call completed',
              status: 'successful',
              time: '15 minutes ago',
              duration: '4:32',
              statusColor: 'text-green-600'
            },
            {
              id: 3,
              phoneNumber: '+1-555-0789',
              action: 'Call failed',
              status: 'user_unavailable',
              time: '28 minutes ago',
              duration: null,
              statusColor: 'text-red-600'
            },
            {
              id: 4,
              phoneNumber: '+1-555-0321',
              action: 'Call delivered',
              status: 'read',
              time: '45 minutes ago',
              duration: '2:18',
              statusColor: 'text-green-600'
            }
          ].map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <PhoneIcon className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action} to {activity.phoneNumber}
                  </p>
                  <p className={`text-sm ${activity.statusColor}`}>
                    Status: {activity.status}
                    {activity.duration && ` • Duration: ${activity.duration}`}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
