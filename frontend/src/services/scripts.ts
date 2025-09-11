import apiClient from '@/lib/api';
import { Script, ScriptType } from '@/types';

export class ScriptsService {
  /**
   * Get all scripts for the authenticated user
   */
  static async getScripts(): Promise<Script[]> {
    const response = await apiClient.get<Script[]>('/scripts');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch scripts');
  }

  /**
   * Get a specific script by ID
   */
  static async getScript(scriptId: string): Promise<Script> {
    const response = await apiClient.get<Script>(`/scripts/${scriptId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch script');
  }

  /**
   * Create a new script
   */
  static async createScript(scriptData: Partial<Script>): Promise<Script> {
    const response = await apiClient.post<Script>('/scripts', scriptData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create script');
  }

  /**
   * Update an existing script
   */
  static async updateScript(scriptId: string, scriptData: Partial<Script>): Promise<Script> {
    const response = await apiClient.put<Script>(`/scripts/${scriptId}`, scriptData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update script');
  }

  /**
   * Delete a script
   */
  static async deleteScript(scriptId: string): Promise<void> {
    const response = await apiClient.delete(`/scripts/${scriptId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete script');
    }
  }

  /**
   * Activate a script
   */
  static async activateScript(scriptId: string): Promise<Script> {
    const response = await apiClient.post<Script>(`/scripts/${scriptId}/activate`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to activate script');
  }

  /**
   * Deactivate a script
   */
  static async deactivateScript(scriptId: string): Promise<Script> {
    const response = await apiClient.post<Script>(`/scripts/${scriptId}/deactivate`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to deactivate script');
  }

  /**
   * Clone a script
   */
  static async cloneScript(scriptId: string, name: string): Promise<Script> {
    const response = await apiClient.post<Script>(`/scripts/${scriptId}/clone`, { name });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to clone script');
  }

  /**
   * Test a script with sample input
   */
  static async testScript(scriptId: string, testInput: string): Promise<{
    response: string;
    confidence: number;
    processingTime: number;
  }> {
    const response = await apiClient.post<{
      response: string;
      confidence: number;
      processingTime: number;
    }>(`/scripts/${scriptId}/test`, { input: testInput });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to test script');
  }

  /**
   * Get script performance analytics
   */
  static async getScriptAnalytics(scriptId: string, dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<{
    totalUsage: number;
    successRate: number;
    averageConfidence: number;
    averageResponseTime: number;
    usageByDay: Array<{ date: string; count: number }>;
    sentimentDistribution: Array<{ sentiment: string; count: number }>;
  }> {
    const queryParams = dateRange ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : '';
    const response = await apiClient.get<{
      totalUsage: number;
      successRate: number;
      averageConfidence: number;
      averageResponseTime: number;
      usageByDay: Array<{ date: string; count: number }>;
      sentimentDistribution: Array<{ sentiment: string; count: number }>;
    }>(`/scripts/${scriptId}/analytics${queryParams}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get script analytics');
  }

  /**
   * Get script versions/history
   */
  static async getScriptVersions(scriptId: string): Promise<Array<{
    id: string;
    version: number;
    content: string;
    createdAt: string;
    createdBy: string;
    isActive: boolean;
  }>> {
    const response = await apiClient.get<Array<{
      id: string;
      version: number;
      content: string;
      createdAt: string;
      createdBy: string;
      isActive: boolean;
    }>>(`/scripts/${scriptId}/versions`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get script versions');
  }

  /**
   * Revert to a specific script version
   */
  static async revertToVersion(scriptId: string, versionId: string): Promise<Script> {
    const response = await apiClient.post<Script>(`/scripts/${scriptId}/revert`, { versionId });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to revert script version');
  }

  /**
   * Get script templates
   */
  static async getScriptTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: ScriptType;
    content: string;
    category: string;
  }>> {
    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      description: string;
      type: ScriptType;
      content: string;
      category: string;
    }>>('/scripts/templates');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get script templates');
  }

  /**
   * Create script from template
   */
  static async createFromTemplate(templateId: string, name: string): Promise<Script> {
    const response = await apiClient.post<Script>('/scripts/from-template', { templateId, name });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create script from template');
  }

  /**
   * Validate script content
   */
  static async validateScript(content: string, type: ScriptType): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const response = await apiClient.post<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
      suggestions: string[];
    }>('/scripts/validate', { content, type });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to validate script');
  }

  /**
   * Get script usage statistics
   */
  static async getScriptUsage(scriptId: string): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageRating: number;
    lastUsed: string;
    campaignsUsing: Array<{ id: string; name: string }>;
  }> {
    const response = await apiClient.get<{
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      averageRating: number;
      lastUsed: string;
      campaignsUsing: Array<{ id: string; name: string }>;
    }>(`/scripts/${scriptId}/usage`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get script usage statistics');
  }

  /**
   * Export script
   */
  static async exportScript(scriptId: string, format: 'json' | 'txt' = 'json'): Promise<Blob> {
    const queryParams = `?format=${format}`;
    const response = await apiClient.get(`/scripts/${scriptId}/export${queryParams}`);
    // Note: For blob responses, we need to handle differently
    // This is a simplified version - actual implementation would need proper blob handling
    if (response.success) {
      return new Blob([JSON.stringify(response.data)], { type: format === 'json' ? 'application/json' : 'text/plain' });
    }
    throw new Error(response.error || 'Failed to export script');
  }

  /**
   * Import script
   */
  static async importScript(file: File): Promise<Script> {
    const formData = new FormData();
    formData.append('file', file);

    // Note: FormData uploads need special handling with apiClient
    // This is a simplified version - actual implementation would need proper FormData handling
    const response = await apiClient.post<Script>('/scripts/import', formData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to import script');
  }
}
