'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WidgetCreateDialog from '@/components/widgets/WidgetCreateDialog';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateWidgetPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <WidgetCreateDialog
        open={open}
        organizationId={user?.organizationId}
        onClose={() => {
          setOpen(false);
          router.back();
        }}
        onSaved={() => {
          setOpen(false);
          router.push('/dashboard?created=true');
        }}
      />
    </div>
  );
}
