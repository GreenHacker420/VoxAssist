'use client';

import { useState } from 'react';
import {
  CogIcon,
  EyeIcon,
  CodeBracketIcon,
  TrashIcon,
  ChartBarIcon,
  GlobeAltIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { DemoWidget } from '@/demo/widgets';
import toast from 'react-hot-toast';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface EnhancedWidgetCardProps {
  widget: DemoWidget;
  isDemoMode?: boolean;
  onEdit?: (widget: DemoWidget) => void;
  onDelete?: (widgetId: string) => void;
  onToggleStatus?: (widgetId: string, isActive: boolean) => void;
}

export default function EnhancedWidgetCard({ 
  widget, 
  isDemoMode = false, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}: EnhancedWidgetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Create a lightweight 7-day trend from totals for sparkline visualization
  const trendData = (() => {
    const seed = widget.totalInteractions + Math.round(widget.conversionRate * 1000);
    const rng = (i: number) => (Math.sin(seed + i) + 1) / 2; // 0..1
    const base = Math.max(10, Math.floor(widget.totalInteractions / 50));
    return Array.from({ length: 7 }).map((_, i) => ({
      day: `D${i + 1}`,
      value: Math.max(5, Math.floor(base + rng(i) * base * 0.8))
    }));
  })();

  const handleCopyEmbedCode = () => {
    const embedCode = `<script 
  src="https://your-domain.com/widget.js" 
  data-widget-id="${widget.id}"
  data-position="${widget.configuration.position}"
  data-theme="${widget.configuration.theme}"
  data-primary-color="${widget.configuration.primaryColor}"
  data-greeting="${widget.configuration.greeting}"
></script>`;

    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard!');
  };

  const handleToggleStatus = () => {
    onToggleStatus?.(widget.id, !widget.isActive);
    toast.success(`Widget ${widget.isActive ? 'deactivated' : 'activated'} ${isDemoMode ? '(demo)' : ''}`);
  };

  const handlePreview = () => {
    toast.success('Widget preview opened in new tab (demo)');
    // In real implementation, this would open a preview window
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPositionLabel = (position: string) => {
    const positions = {
      'bottom-right': 'Bottom Right',
      'bottom-left': 'Bottom Left',
      'top-right': 'Top Right',
      'top-left': 'Top Left'
    };
    return positions[position as keyof typeof positions] || position;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold text-gray-900">{widget.name}</h4>
              {isDemoMode && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Demo
                </span>
              )}
            </div>

        {/* 7-day Trend Sparkline */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">7-day trend</span>
            <span className="text-[10px] text-gray-400">Interactions</span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <Tooltip cursor={{ stroke: '#e5e7eb' }} contentStyle={{ fontSize: 12 }} labelFormatter={() => ''} formatter={(v: number) => [`${v}`, 'Interactions']} />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
            <p className="text-sm text-gray-600 mt-1">{widget.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(widget.isActive)}`}>
              {widget.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={handleToggleStatus}
              className={`p-1.5 rounded-md transition-colors ${
                widget.isActive 
                  ? 'text-green-600 hover:bg-green-50' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {widget.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(widget.totalInteractions)}
            </div>
            <div className="text-xs text-gray-500">Interactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(widget.conversionRate * 100)}%
            </div>
            <div className="text-xs text-gray-500">Conversion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatDuration(widget.averageSessionDuration)}
            </div>
            <div className="text-xs text-gray-500">Avg Session</div>
          </div>
        </div>

        {/* Configuration Preview */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Position:</span>
            <span className="font-medium">{getPositionLabel(widget.configuration.position)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Theme:</span>
            <span className="font-medium capitalize">{widget.configuration.theme}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Language:</span>
            <span className="font-medium uppercase">{widget.configuration.language}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onEdit?.(widget)}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <CogIcon className="h-4 w-4 mr-1.5" />
            Edit
          </button>
          
          <button
            onClick={handlePreview}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <EyeIcon className="h-4 w-4 mr-1.5" />
            Preview
          </button>
          
          <button
            onClick={handleCopyEmbedCode}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1.5" />
            Code
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-4 w-4 mr-1.5" />
            Analytics
          </button>
        </div>

        {/* Expanded Analytics */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last used:</span>
                <span className="font-medium">
                  {new Date(widget.lastUsed).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(widget.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total sessions:</span>
                <span className="font-medium">{formatNumber(widget.totalInteractions)}</span>
              </div>
            </div>
            
            {isDemoMode && (
              <div className="mt-3 p-2 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  <strong>Demo Mode:</strong> This widget shows simulated analytics data.
                  In production, you&apos;ll see real user interaction metrics.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <GlobeAltIcon className="h-4 w-4 mr-1" />
            Widget ID: {widget.id}
          </div>
          <button
            onClick={() => onDelete?.(widget.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
