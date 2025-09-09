import StatCard from '@/components/UI/StatCard';
import {
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface StatsGridProps {
  stats: {
    totalCalls: number;
    successRate: number;
    avgCallDuration: number;
    failedCalls: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statsData = [
    {
      title: 'Total Calls',
      value: stats.totalCalls.toLocaleString(),
      icon: PhoneIcon,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: CheckCircleIcon,
      change: 2.1,
      changeType: 'increase' as const,
    },
    {
      title: 'Avg Call Duration',
      value: `${Math.floor(stats.avgCallDuration / 60)}m ${stats.avgCallDuration % 60}s`,
      icon: ClockIcon,
      change: 5.4,
      changeType: 'decrease' as const,
    },
    {
      title: 'Failed Calls',
      value: stats.failedCalls.toLocaleString(),
      icon: ExclamationTriangleIcon,
      change: 3.2,
      changeType: 'decrease' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          change={stat.change}
          changeType={stat.changeType}
        />
      ))}
    </div>
  );
}
