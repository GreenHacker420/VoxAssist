interface WakeupResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface WakeupNotification {
  type: 'info' | 'success' | 'error';
  message: string;
}

class BackendWakeupService {
  private static instance: BackendWakeupService;
  private readonly BACKEND_URL = 'https://voxassist.onrender.com';
  private readonly HEALTH_ENDPOINT = '/health';
  private readonly TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private isWakingUp = false;
  private lastWakeupAttempt = 0;
  private readonly WAKEUP_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): BackendWakeupService {
    if (!BackendWakeupService.instance) {
      BackendWakeupService.instance = new BackendWakeupService();
    }
    return BackendWakeupService.instance;
  }

  private showNotification(notification: WakeupNotification): void {
    // Create a simple notification system
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('backend-wakeup-notification', {
        detail: notification
      });
      window.dispatchEvent(event);
    }
  }

  private async pingBackend(attempt = 1): Promise<WakeupResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(`${this.BACKEND_URL}${this.HEALTH_ENDPOINT}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          success: true,
          message: 'Backend is active'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        throw new Error('Request timeout - backend may be spinning up');
      }
      throw error;
    }
  }

  async wakeupBackend(): Promise<WakeupResponse> {
    // Check cooldown period
    const now = Date.now();
    if (now - this.lastWakeupAttempt < this.WAKEUP_COOLDOWN) {
      return {
        success: true,
        message: 'Backend wake-up recently attempted, skipping'
      };
    }

    // Prevent multiple simultaneous wake-up attempts
    if (this.isWakingUp) {
      return {
        success: false,
        error: 'Wake-up already in progress'
      };
    }

    this.isWakingUp = true;
    this.lastWakeupAttempt = now;

    try {
      // Show initial notification
      this.showNotification({
        type: 'info',
        message: 'Waking up backend server... This may take up to 30 seconds.'
      });

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const result = await this.pingBackend(attempt);
          
          // Success notification
          this.showNotification({
            type: 'success',
            message: 'Backend server is now active!'
          });

          return result;
        } catch (error: unknown) {
          lastError = error as Error;
          
          if (attempt < this.MAX_RETRIES) {
            // Show retry notification
            this.showNotification({
              type: 'info',
              message: `Attempt ${attempt} failed, retrying... (${this.MAX_RETRIES - attempt} attempts remaining)`
            });
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      // All attempts failed
      const errorMessage = lastError?.message || 'Unknown error occurred';
      this.showNotification({
        type: 'error',
        message: `Failed to wake up backend after ${this.MAX_RETRIES} attempts: ${errorMessage}`
      });

      return {
        success: false,
        error: errorMessage
      };

    } finally {
      this.isWakingUp = false;
    }
  }

  async checkBackendStatus(): Promise<WakeupResponse> {
    try {
      const result = await this.pingBackend();
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message || 'Backend check failed'
      };
    }
  }

  isCurrentlyWakingUp(): boolean {
    return this.isWakingUp;
  }

  getLastWakeupAttempt(): number {
    return this.lastWakeupAttempt;
  }
}

// Export singleton instance
export const backendWakeupService = BackendWakeupService.getInstance();
export type { WakeupResponse, WakeupNotification };
