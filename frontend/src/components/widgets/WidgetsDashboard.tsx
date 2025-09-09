'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import { DEMO_WIDGETS, DemoWidget } from '@/demo/widgets';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedWidgetCard from './EnhancedWidgetCard';
import toast from 'react-hot-toast';

interface WidgetsDashboardProps {
  onCreateWidget?: () => void;
}

export default function WidgetsDashboard({ onCreateWidget }: WidgetsDashboardProps) {
  const { isDemoMode } = useAuth();
  const [widgets, setWidgets] = useState<DemoWidget[]>([]);
  const [filteredWidgets, setFilteredWidgets] = useState<DemoWidget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'interactions' | 'conversion' | 'recent'>('recent');
  const [compact, setCompact] = useState(false);

  // Load widgets (demo data or real API call)
  useEffect(() => {
    const loadWidgets = async () => {
      setIsLoading(true);
      try {
        if (isDemoMode) {
          // Use demo data
          setWidgets(DEMO_WIDGETS);
        } else {
          // In real implementation, fetch from API
          // const response = await WidgetsService.list(organizationId);
          // setWidgets(response);
          setWidgets([]);
        }
      } catch (error) {
        console.error('Failed to load widgets:', error);
        toast.error('Failed to load widgets');
      } finally {
        setIsLoading(false);
      }
    };

    loadWidgets();
  }, [isDemoMode]);

  // Filter widgets based on search and status
  useEffect(() => {
    let filtered = widgets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(widget =>
        statusFilter === 'active' ? widget.isActive : !widget.isActive
      );
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'interactions':
          return b.totalInteractions - a.totalInteractions;
        case 'conversion':
          return b.conversionRate - a.conversionRate;
        case 'recent':
        default:
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      }
    });

    setFilteredWidgets(sorted);
  }, [widgets, searchTerm, statusFilter, sortBy]);

  const handleEditWidget = (widget: DemoWidget) => {
    toast.success(`Edit widget: ${widget.name} ${isDemoMode ? '(demo)' : ''}`);
    // In real implementation, open edit modal or navigate to edit page
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (isDemoMode) {
      setWidgets(prev => prev.filter(w => w.id !== widgetId));
      toast.success('Widget deleted (demo)');
    } else {
      // In real implementation, call API to delete
      toast.success('Widget deleted');
    }
  };

  const handleToggleStatus = (widgetId: string, isActive: boolean) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === widgetId ? { ...widget, isActive } : widget
      )
    );
  };

  const getWidgetStats = () => {
    const totalWidgets = widgets.length;
    const activeWidgets = widgets.filter(w => w.isActive).length;
    const totalInteractions = widgets.reduce((sum, w) => sum + w.totalInteractions, 0);
    const avgConversion = widgets.length > 0 
      ? widgets.reduce((sum, w) => sum + w.conversionRate, 0) / widgets.length 
      : 0;

    return { totalWidgets, activeWidgets, totalInteractions, avgConversion };
  };

  const stats = getWidgetStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voice Chat Widgets</h2>
          <p className="text-gray-600 mt-1">
            Manage and monitor your embeddable voice chat widgets
            {isDemoMode && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Demo Mode
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onCreateWidget}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Widget
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">{stats.totalWidgets}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Widgets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalWidgets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">{stats.activeWidgets}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Widgets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeWidgets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">
                  {stats.totalInteractions > 1000 ? `${Math.floor(stats.totalInteractions / 1000)}k` : stats.totalInteractions}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Interactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalInteractions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                <span className="text-orange-600 font-semibold text-sm">
                  {Math.round(stats.avgConversion * 100)}%
                </span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Conversion</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(stats.avgConversion * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="recent">Recently Used</option>
              <option value="name">Name (A-Z)</option>
              <option value="interactions">Interactions (High-Low)</option>
              <option value="conversion">Conversion (High-Low)</option>
            </select>
          </div>

          {/* Density Toggle */}
          <button
            type="button"
            onClick={() => setCompact((c) => !c)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm ${compact ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            title={compact ? 'Compact view enabled' : 'Enable compact view'}
          >
            <Bars3BottomLeftIcon className="h-4 w-4 mr-2" />
            {compact ? 'Compact' : 'Comfortable'}
          </button>
        </div>
      </div>

      {/* Widgets Grid */}
      {filteredWidgets.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <PlusIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No widgets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first voice chat widget.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <div className="mt-6">
              <button
                onClick={onCreateWidget}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Widget
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${compact ? 'gap-4' : 'gap-6'}`}>
          {filteredWidgets.map((widget) => (
            <EnhancedWidgetCard
              key={widget.id}
              widget={widget}
              isDemoMode={isDemoMode}
              onEdit={handleEditWidget}
              onDelete={handleDeleteWidget}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
