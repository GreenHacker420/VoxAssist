'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import WhatsAppAnalytics from '@/components/WhatsApp/WhatsAppAnalytics';
import { useAuth } from '@/contexts/AuthContext';

export default function WhatsAppAnalyticsPage() {
  const { isDemoMode } = useAuth();

  return (
    <DashboardLayout>
      <WhatsAppAnalytics isDemoMode={isDemoMode} />
    </DashboardLayout>
  );
}
