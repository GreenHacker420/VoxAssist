'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WidgetCreationWizard from '@/components/widgets/WidgetCreationWizard';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetDTO } from '@/services/widgets';

export default function CreateWidgetPage() {
  const router = useRouter();
  const { user, isDemoMode } = useAuth();
  const [open, setOpen] = useState(true);

  const handleSuccess = (widget: WidgetDTO) => {
    setOpen(false);
    router.push(`/widgets/embed/${widget.id}?created=true`);
  };

  const handleClose = () => {
    setOpen(false);
    router.back();
  };

  // Ensure user has organizationId or is in demo mode
  if (!user?.organizationId && !isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to create widgets.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <WidgetCreationWizard
        open={open}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
