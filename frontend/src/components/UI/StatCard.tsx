
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change?: number;
  changeType?: 'increase' | 'decrease';
  changeLabel?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  changeLabel = 'from last period'
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-gray-400" aria-hidden="true" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
      
      {change !== undefined && changeType && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center text-sm">
            {changeType === 'increase' ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`ml-1 font-medium ${
                changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {Math.abs(change)}%
            </span>
            <span className="ml-1 text-gray-500">{changeLabel}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
