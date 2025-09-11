import apiClient from '@/lib/api';

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
    authId?: string;
    apiKey?: string;
    apiSecret?: string;
    [key: string]: unknown;
  };
  settings: {
    region?: string;
    enableRecording?: boolean;
    enableTranscription?: boolean;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  details?: {
    accountInfo?: {
      name: string;
      status: string;
    };
    phoneNumbers?: string[];
    error?: string;
  };
}

export interface ProviderStatus {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  lastChecked: string;
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

export class ProvidersService {
  /**
   * Get all provider configurations for the current user
   */
  static async getConfigs(): Promise<ProviderConfig[]> {
    const response = await apiClient.get<ProviderConfig[]>('/providers/configs');
    return response.data;
  }

  /**
   * Create a new provider configuration
   */
  static async createConfig(config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderConfig> {
    const response = await apiClient.post<ProviderConfig>('/providers/configs', config);
    return response.data;
  }

  /**
   * Update an existing provider configuration
   */
  static async updateConfig(id: string, config: Partial<ProviderConfig>): Promise<ProviderConfig> {
    const response = await apiClient.put<ProviderConfig>(`/providers/configs/${id}`, config);
    return response.data;
  }

  /**
   * Delete a provider configuration
   */
  static async deleteConfig(id: string): Promise<void> {
    await apiClient.delete(`/providers/configs/${id}`);
  }

  /**
   * Test connection to a provider
   */
  static async testConnection(configId: string): Promise<ConnectionTestResult> {
    const response = await apiClient.post<ConnectionTestResult>(`/providers/configs/${configId}/test`);
    return response.data;
  }

  /**
   * Get the status of all configured providers
   */
  static async getProviderStatuses(): Promise<ProviderStatus[]> {
    const response = await apiClient.get<ProviderStatus[]>('/providers/status');
    return response.data;
  }

  /**
   * Get the active provider configuration for a specific type
   */
  static async getActiveProvider(type: 'phone' | 'whatsapp' = 'phone'): Promise<ProviderConfig | null> {
    const response = await apiClient.get<ProviderConfig | null>(`/providers/active?type=${type}`);
    return response.data;
  }

  /**
   * Set a provider as the primary active provider
   */
  static async setPrimaryProvider(configId: string): Promise<void> {
    await apiClient.post(`/providers/configs/${configId}/set-primary`);
  }

  /**
   * Toggle provider active status
   */
  static async toggleProviderStatus(configId: string, isActive: boolean): Promise<ProviderConfig> {
    const response = await apiClient.patch<ProviderConfig>(`/providers/configs/${configId}/status`, { isActive });
    return response.data;
  }

  /**
   * Get provider configuration by ID (without sensitive credentials)
   */
  static async getConfig(id: string): Promise<ProviderConfig> {
    const response = await apiClient.get<ProviderConfig>(`/providers/configs/${id}`);
    return response.data;
  }

  /**
   * Validate provider credentials without saving
   */
  static async validateCredentials(provider: string, credentials: Record<string, unknown>): Promise<ConnectionTestResult> {
    const response = await apiClient.post<ConnectionTestResult>('/providers/validate', {
      provider,
      credentials
    });
    return response.data;
  }
}
