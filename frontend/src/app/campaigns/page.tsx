'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Campaign } from '@/types';
import { formatDate, formatPercentage } from '@/lib/utils';
import {
  MegaphoneIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for campaigns
    const mockCampaigns: Campaign[] = [
      {
        id: 1,
        name: 'Q1 Customer Outreach',
        description: 'Quarterly customer satisfaction and upselling campaign',
        status: 'active',
        startDate: '2023-12-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z',
        targetCount: 1000,
        completedCount: 650,
        successRate: 23.5,
        createdAt: '2023-11-15T10:00:00Z',
      },
      {
        id: 2,
        name: 'Holiday Promotion',
        description: 'Special holiday offers and promotions campaign',
        status: 'paused',
        startDate: '2023-12-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
        targetCount: 500,
        completedCount: 125,
        successRate: 18.2,
        createdAt: '2023-12-01T14:30:00Z',
      },
      {
        id: 3,
        name: 'Lead Qualification',
        description: 'Qualifying new leads from website and referrals',
        status: 'draft',
        targetCount: 200,
        completedCount: 0,
        createdAt: '2023-12-05T09:15:00Z',
      },
    ];
    
    setCampaigns(mockCampaigns);
    setIsLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return PlayIcon;
      case 'paused':
        return PauseIcon;
      case 'completed':
        return StopIcon;
      default:
        return PencilIcon;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
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
        {/* Page header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
            <p className="mt-2 text-sm text-gray-700">
              Create and manage voice calling campaigns for outreach and lead generation.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="h-4 w-4 inline mr-2" />
              New Campaign
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Campaigns grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {campaigns.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign.</p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  New Campaign
                </button>
              </div>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const StatusIcon = getStatusIcon(campaign.status);
              const progress = campaign.targetCount ? (campaign.completedCount / campaign.targetCount) * 100 : 0;
              
              return (
                <div key={campaign.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <StatusIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        getStatusColor(campaign.status)
                      )}
                    >
                      {campaign.status}
                    </span>
                  </div>

                  {campaign.description && (
                    <p className="text-sm text-gray-600 mb-4">{campaign.description}</p>
                  )}

                  {/* Progress */}
                  {campaign.targetCount && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm font-medium text-gray-900 mb-1">
                        <span>Progress</span>
                        <span>{campaign.completedCount} / {campaign.targetCount}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{formatPercentage(progress, 0)} complete</span>
                        {campaign.successRate && (
                          <span>{formatPercentage(campaign.successRate)} success rate</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="space-y-2 mb-4">
                    {campaign.startDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Start Date:</span>
                        <span className="text-gray-900">{formatDate(campaign.startDate)}</span>
                      </div>
                    )}
                    {campaign.endDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">End Date:</span>
                        <span className="text-gray-900">{formatDate(campaign.endDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-900">{formatDate(campaign.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {campaign.status === 'draft' && (
                      <button
                        type="button"
                        className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                      >
                        <PlayIcon className="h-4 w-4 inline mr-1" />
                        Start
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        type="button"
                        className="flex-1 rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500"
                      >
                        <PauseIcon className="h-4 w-4 inline mr-1" />
                        Pause
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        type="button"
                        className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                      >
                        <PlayIcon className="h-4 w-4 inline mr-1" />
                        Resume
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 inline mr-1" />
                      View
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
