'use client';

import { useBackendWakeup } from '@/hooks/useBackendWakeup';
import { useEffect } from 'react';

export default function BackendStatusNotification() {
  const { notification, clearNotification } = useBackendWakeup();

  // Auto-clear error notifications after 10 seconds
  useEffect(() => {
    if (notification?.type === 'error') {
      const timer = setTimeout(() => {
        clearNotification();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="h-5 w-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`rounded-lg border p-4 shadow-lg ${getNotificationStyles()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">
              {notification.message}
            </p>
          </div>
          {notification.type !== 'info' && (
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={clearNotification}
                className="inline-flex rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
