import apiClient from '@/lib/api';
import { isDemoMode } from '@/demo';

export interface ProviderConfig {
  id?: string;
  name: string;
  type: 'phone' | 'whatsapp';
  provider: 'twilio' | 'plivo' | 'ringg' | 'sarvam';
  isActive: boolean;
  isPrimary: boolean;
  credentials: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  settings: {
    region?: string;
    enableRecording?: boolean;
    enableTranscription?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  error?: string;
  details?: {
    accountInfo?: Record<string, unknown>;
    phoneNumbers?: string[];
    balance?: number;
  };
}

export interface ProviderStatus {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked: string;
  errorMessage?: string;
}

/**
 * Service for managing calling service provider configurations
 */
export class ProvidersService {
  /**
   * Get all provider configurations for the current user
   */
  static async getConfigs(): Promise<ProviderConfig[]> {
    if (isDemoMode()) {
      return [
        {
          id: 'demo-twilio-1',
          name: 'Demo Twilio Primary',
          type: 'phone',
          provider: 'twilio',
          isActive: true,
          isPrimary: true,
          credentials: {
            accountSid: 'AC***demo***',
            authToken: '***demo***',
            phoneNumber: '+1234567890'
          },
          settings: {
            region: 'us1',
            enableRecording: true,
            enableTranscription: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo-plivo-1',
          name: 'Demo Plivo Backup',
          type: 'phone',
          provider: 'plivo',
          isActive: false,
          isPrimary: false,
          credentials: {
            accountSid: 'PLIVO***demo***',
            authToken: '***demo***',
            phoneNumber: '+1987654321'
          },
          settings: {
            region: 'us1',
            enableRecording: false,
            enableTranscription: false
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo-ringg-1',
          name: 'Demo Ringg AI',
          type: 'phone',
          provider: 'ringg',
          isActive: true,
          isPrimary: false,
          credentials: {
            apiKey: 'RINGG***demo***',
            apiSecret: '***demo***'
          },
          settings: {
            region: 'us1',
            enableRecording: true,
            enableTranscription: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo-sarvam-1',
          name: 'Demo Sarvam AI',
          type: 'phone',
          provider: 'sarvam',
          isActive: false,
          isPrimary: false,
          credentials: {
            apiKey: 'SARVAM***demo***',
            apiSecret: '***demo***'
          },
          settings: {
            region: 'ap1',
            enableRecording: true,
            enableTranscription: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }

    const response = await apiClient.get<ProviderConfig[]>('/providers/configs');
    return response.data || [];
  }

  /**
   * Create a new provider configuration
   */
  static async createConfig(config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderConfig> {
    if (isDemoMode()) {
      return {
        ...config,
        id: `demo-${config.provider}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await apiClient.post<ProviderConfig>('/providers/configs', config);
    return response.data!;
  }

  /**
   * Update an existing provider configuration
   */
  static async updateConfig(id: string, config: Partial<ProviderConfig>): Promise<ProviderConfig> {
    if (isDemoMode()) {
      return {
        ...config,
        id,
        updatedAt: new Date().toISOString()
      } as ProviderConfig;
    }

    const response = await apiClient.put<ProviderConfig>(`/providers/configs/${id}`, config);
    return response.data!;
  }

  /**
   * Delete a provider configuration
   */
  static async deleteConfig(id: string): Promise<void> {
    if (isDemoMode()) {
      return;
    }

    await apiClient.delete(`/providers/configs/${id}`);
  }

  /**
   * Test connection to a provider
   */
  static async testConnection(configId: string): Promise<ConnectionTestResult> {
    if (isDemoMode()) {
      // Simulate different test results for demo
      const demoResults = [
        {
          connected: true,
          details: {
            accountInfo: { name: 'Demo Account', status: 'active' },
            phoneNumbers: ['+1234567890', '+1987654321'],
            balance: 25.50
          }
        },
        {
          connected: false,
          error: 'Invalid credentials'
        },
        {
          connected: true,
          details: {
            accountInfo: { name: 'Demo Backup', status: 'active' },
            phoneNumbers: ['+1555123456'],
            balance: 10.25
          }
        }
      ];

      return demoResults[Math.floor(Math.random() * demoResults.length)];
    }

    const response = await apiClient.post<ConnectionTestResult>(`/providers/configs/${configId}/test`);
    return response.data!;
  }

  /**
   * Get the status of all configured providers
   */
  static async getProviderStatuses(): Promise<ProviderStatus[]> {
    if (isDemoMode()) {
      return [
        {
          id: 'demo-twilio-1',
          name: 'Demo Twilio Primary',
          provider: 'twilio',
          status: 'connected',
          lastChecked: new Date().toISOString()
        },
        {
          id: 'demo-plivo-1',
          name: 'Demo Plivo Backup',
          provider: 'plivo',
          status: 'disconnected',
          lastChecked: new Date().toISOString(),
          errorMessage: 'Provider disabled'
        }
      ];
    }

    const response = await apiClient.get<ProviderStatus[]>('/providers/status');
    return response.data || [];
  }

  /**
   * Get the active provider configuration for a specific type
   */
  static async getActiveProvider(type: 'phone' | 'whatsapp' = 'phone'): Promise<ProviderConfig | null> {
    if (isDemoMode()) {
      return {
        id: 'demo-twilio-1',
        name: 'Demo Twilio Primary',
        type: 'phone',
        provider: 'twilio',
        isActive: true,
        isPrimary: true,
        credentials: {
          accountSid: 'AC***demo***',
          authToken: '***demo***',
          phoneNumber: '+1234567890'
        },
        settings: {
          region: 'us1',
          enableRecording: true,
          enableTranscription: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await apiClient.get<ProviderConfig | null>(`/providers/active?type=${type}`);
    return response.data || null;
  }

  /**
   * Set a provider as the primary active provider
   */
  static async setPrimaryProvider(configId: string): Promise<void> {
    if (isDemoMode()) {
      return;
    }

    await apiClient.post(`/providers/configs/${configId}/set-primary`);
  }

  /**
   * Toggle provider active status
   */
  static async toggleProviderStatus(configId: string, isActive: boolean): Promise<ProviderConfig> {
    if (isDemoMode()) {
      return {
        id: configId,
        name: 'Demo Provider',
        type: 'phone',
        provider: 'twilio',
        isActive,
        isPrimary: false,
        credentials: {},
        settings: {},
        updatedAt: new Date().toISOString()
      } as ProviderConfig;
    }

    const response = await apiClient.patch<ProviderConfig>(`/providers/configs/${configId}/status`, { isActive });
    return response.data!;
  }

  /**
   * Get provider configuration by ID (without sensitive credentials)
   */
  static async getConfig(id: string): Promise<ProviderConfig> {
    if (isDemoMode()) {
      return {
        id,
        name: 'Demo Provider Config',
        type: 'phone',
        provider: 'twilio',
        isActive: true,
        isPrimary: false,
        credentials: {
          accountSid: 'AC***demo***',
          phoneNumber: '+1234567890'
          // authToken is not returned for security
        },
        settings: {
          region: 'us1',
          enableRecording: true,
          enableTranscription: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await apiClient.get<ProviderConfig>(`/providers/configs/${id}`);
    return response.data!;
  }

  /**
   * Validate provider credentials without saving
   */
  static async validateCredentials(provider: string, credentials: Record<string, unknown>): Promise<ConnectionTestResult> {
    if (isDemoMode()) {
      return {
        connected: true,
        details: {
          accountInfo: { name: 'Demo Validation', status: 'active' }
        }
      };
    }

    const response = await apiClient.post<ConnectionTestResult>('/providers/validate', { provider, credentials });
    return response.data!;
  }
}
