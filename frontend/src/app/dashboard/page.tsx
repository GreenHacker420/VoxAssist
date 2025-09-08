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
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateWidget = () => {
    router.push('/widgets/create');
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </UserLayout>
    );
  }

  const stats = {
    totalCalls: 1234,
    successRate: 98.5,
    avgCallDuration: 154, // seconds
    failedCalls: 18,
  };

  const activities = [
    {
      id: '1',
      type: 'call' as const,
      title: 'Call completed',
      description: 'Customer support inquiry',
      timestamp: '2 minutes ago',
      status: 'completed' as const,
    },
    {
      id: '2',
      type: 'system' as const,
      title: 'Widget updated',
      description: 'Configuration changes applied',
      timestamp: '1 hour ago',
      status: 'completed' as const,
    },
  ];

  return (
    <UserLayout>
      <div className="space-y-8">
        <DashboardHeader onCreateWidget={handleCreateWidget} />
        
        <StatsGrid stats={stats} />
        
        <WidgetsList widgets={widgets} onCreateWidget={handleCreateWidget} />
        
        <RecentActivity activities={activities} />
      </div>
    </UserLayout>
  );
}
