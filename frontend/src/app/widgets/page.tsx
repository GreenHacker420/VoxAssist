'use client';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import WidgetsDashboard from '@/components/widgets/WidgetsDashboard';

export default function WidgetsPage() {
  const router = useRouter();

  const handleCreateWidget = () => {
    router.push('/widgets/create');
  };

  return (
    <DashboardLayout>
      <WidgetsDashboard onCreateWidget={handleCreateWidget} />
    </DashboardLayout>
  );
}
