'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  FaceSmileIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface DemoCallAnalyticsProps {
  callStatus: string;
  duration: number;
}

export default function DemoCallAnalytics({ callStatus, duration }: DemoCallAnalyticsProps) {
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    sentimentScore: 0.8,
    confidenceScore: 0.92,
    speechClarity: 0.88,
    responseTime: 1.2,
    customerSatisfaction: 0.85
  });

  const [sentimentHistory, setSentimentHistory] = useState([
    { time: '0:00', sentiment: 0.5, confidence: 0.8 },
    { time: '0:30', sentiment: 0.6, confidence: 0.85 },
    { time: '1:00', sentiment: 0.75, confidence: 0.9 },
    { time: '1:30', sentiment: 0.8, confidence: 0.92 },
    { time: '2:00', sentiment: 0.85, confidence: 0.94 }
  ]);

  const [emotionBreakdown] = useState([
    { name: 'Joy', value: 45, color: '#10B981' },
    { name: 'Neutral', value: 30, color: '#6B7280' },
    { name: 'Surprise', value: 15, color: '#F59E0B' },
    { name: 'Concern', value: 10, color: '#EF4444' }
  ]);

  const [callQualityMetrics] = useState([
    { metric: 'Audio Quality', score: 95 },
    { metric: 'Speech Recognition', score: 92 },
    { metric: 'Response Accuracy', score: 88 },
    { metric: 'Conversation Flow', score: 90 }
  ]);

  // Simulate real-time updates during active call
  useEffect(() => {
    if (callStatus === 'active') {
      const interval = setInterval(() => {
        setRealTimeMetrics(prev => ({
          sentimentScore: Math.min(0.95, prev.sentimentScore + (Math.random() - 0.5) * 0.1),
          confidenceScore: Math.min(0.98, prev.confidenceScore + (Math.random() - 0.5) * 0.05),
          speechClarity: Math.min(0.95, prev.speechClarity + (Math.random() - 0.5) * 0.08),
          responseTime: Math.max(0.8, prev.responseTime + (Math.random() - 0.5) * 0.3),
          customerSatisfaction: Math.min(0.95, prev.customerSatisfaction + (Math.random() - 0.5) * 0.1)
        }));

        // Add new sentiment data point
        setSentimentHistory(prev => {
          const newTime = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
          const newPoint = {
            time: newTime,
            sentiment: realTimeMetrics.sentimentScore,
            confidence: realTimeMetrics.confidenceScore
          };
          return [...prev.slice(-4), newPoint];
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [callStatus, duration, realTimeMetrics.sentimentScore, realTimeMetrics.confidenceScore]);

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;
  const formatTime = (seconds: number) => `${seconds.toFixed(1)}s`;

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <FaceSmileIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Sentiment</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPercentage(realTimeMetrics.sentimentScore)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Confidence</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPercentage(realTimeMetrics.confidenceScore)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <SpeakerWaveIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Speech Clarity</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatPercentage(realTimeMetrics.speechClarity)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatTime(realTimeMetrics.responseTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-indigo-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Satisfaction</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatPercentage(realTimeMetrics.customerSatisfaction)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Over Time */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sentiment Analysis Over Time
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Live Demo
            </span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 1]} />
                <Tooltip 
                  formatter={(value: number) => [formatPercentage(value), 'Sentiment']}
                />
                <Line 
                  type="monotone" 
                  dataKey="sentiment" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Emotion Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Emotion Breakdown
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              AI Analysis
            </span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {emotionBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {emotionBreakdown.map((emotion, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: emotion.color }}
                />
                <span className="text-sm text-gray-600">
                  {emotion.name} ({emotion.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call Quality Metrics */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Call Quality Metrics
          <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            Technical Analysis
          </span>
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={callQualityMetrics} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="metric" type="category" width={120} />
              <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
              <Bar dataKey="score" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Demo Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-blue-500 mt-1" />
          <div className="ml-3">
            <h4 className="text-lg font-semibold text-blue-900">Demo Analytics</h4>
            <p className="text-blue-700 mt-2">
              These analytics are generated in real-time during your demo call. In production, 
              VoxAssist provides comprehensive insights including customer satisfaction scores, 
              conversation quality metrics, AI performance analytics, and actionable recommendations 
              for improving your voice support experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
