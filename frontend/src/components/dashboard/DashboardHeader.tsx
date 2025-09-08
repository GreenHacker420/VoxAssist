import { PlusIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface DashboardHeaderProps {
  onCreateWidget: () => void;
}

export default function DashboardHeader({ onCreateWidget }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          A comprehensive overview of your VoxAssist performance and analytics.
        </p>
      </div>
      <Button onClick={onCreateWidget} icon={<PlusIcon className="h-5 w-5" />}>
        Create Widget
      </Button>
    </div>
  );
}
