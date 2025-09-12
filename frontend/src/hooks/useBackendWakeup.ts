import { useState, useEffect, useCallback } from 'react';
import { backendWakeupService, WakeupResponse, WakeupNotification } from '@/services/backendWakeup';

interface UseBackendWakeupReturn {
  isWakingUp: boolean;
  isBackendActive: boolean;
  lastError: string | null;
  notification: WakeupNotification | null;
  wakeupBackend: () => Promise<void>;
  checkBackendStatus: () => Promise<void>;
  clearNotification: () => void;
}

export function useBackendWakeup(autoWakeup = false): UseBackendWakeupReturn {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isBackendActive, setIsBackendActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [notification, setNotification] = useState<WakeupNotification | null>(null);

  // Handle notifications from the backend wakeup service
  useEffect(() => {
    const handleNotification = (event: CustomEvent<WakeupNotification>) => {
      setNotification(event.detail);
      
      // Auto-clear success notifications after 5 seconds
      if (event.detail.type === 'success') {
        setTimeout(() => setNotification(null), 5000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('backend-wakeup-notification', handleNotification as EventListener);
      
      return () => {
        window.removeEventListener('backend-wakeup-notification', handleNotification as EventListener);
      };
    }
  }, []);

  const wakeupBackend = useCallback(async () => {
    setIsWakingUp(true);
    setLastError(null);
    
    try {
      const result: WakeupResponse = await backendWakeupService.wakeupBackend();
      
      if (result.success) {
        setIsBackendActive(true);
        setLastError(null);
      } else {
        setLastError(result.error || 'Wake-up failed');
        setIsBackendActive(false);
      }
    } catch (error: unknown) {
      const err = error as Error;
      const errorMessage = err.message || 'Unexpected error during wake-up';
      setLastError(errorMessage);
      setIsBackendActive(false);
    } finally {
      setIsWakingUp(false);
    }
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      const result: WakeupResponse = await backendWakeupService.checkBackendStatus();
      setIsBackendActive(result.success);
      
      if (!result.success) {
        setLastError(result.error || 'Backend check failed');
      } else {
        setLastError(null);
      }
    } catch (error: unknown) {
      const err = error as Error;
      setIsBackendActive(false);
      setLastError(err.message || 'Backend status check failed');
    }
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Auto wake-up on mount if enabled
  useEffect(() => {
    if (autoWakeup) {
      // First check if backend is already active
      checkBackendStatus().then(() => {
        // If backend is not active, attempt wake-up
        if (!isBackendActive) {
          wakeupBackend();
        }
      });
    }
  }, [autoWakeup, checkBackendStatus, wakeupBackend, isBackendActive]);

  // Update waking up state based on service state
  useEffect(() => {
    const interval = setInterval(() => {
      const serviceIsWakingUp = backendWakeupService.isCurrentlyWakingUp();
      if (serviceIsWakingUp !== isWakingUp) {
        setIsWakingUp(serviceIsWakingUp);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWakingUp]);

  return {
    isWakingUp,
    isBackendActive,
    lastError,
    notification,
    wakeupBackend,
    checkBackendStatus,
    clearNotification,
  };
}
