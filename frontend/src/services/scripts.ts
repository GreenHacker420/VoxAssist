import api from '@/lib/api';
import { Script, ScriptType } from '@/types';

export class ScriptsService {
  /**
   * Get all scripts for the authenticated user
   */
  static async getScripts(): Promise<Script[]> {
    const response = await api.get('/scripts');
    return response.data as Script[];
  }

  /**
   * Get a specific script by ID
   */
  static async getScript(scriptId: string): Promise<Script> {
    const response = await api.get(`/scripts/${scriptId}`);
    return response.data as Script;
  }

  /**
   * Create a new script
   */
  static async createScript(scriptData: Partial<Script>): Promise<Script> {
    const response = await api.post('/scripts', scriptData);
    return response.data as Script;
  }

  /**
   * Update an existing script
   */
  static async updateScript(scriptId: string, scriptData: Partial<Script>): Promise<Script> {
    const response = await api.put(`/scripts/${scriptId}`, scriptData);
    return response.data as Script;
  }

  /**
   * Delete a script
   */
  static async deleteScript(scriptId: string): Promise<void> {
    await api.delete(`/scripts/${scriptId}`);
  }

  /**
   * Activate a script
   */
  static async activateScript(scriptId: string): Promise<Script> {
    const response = await api.post(`/scripts/${scriptId}/activate`);
    return response.data as Script;
  }

  /**
   * Deactivate a script
   */
  static async deactivateScript(scriptId: string): Promise<Script> {
    const response = await api.post(`/scripts/${scriptId}/deactivate`);
    return response.data as Script;
  }

  /**
   * Clone a script
   */
  static async cloneScript(scriptId: string, name: string): Promise<Script> {
    const response = await api.post(`/scripts/${scriptId}/clone`, { name });
    return response.data as Script;
  }

  /**
   * Test a script with sample input
   */
  static async testScript(scriptId: string, testInput: string): Promise<{
    response: string;
    confidence: number;
    processingTime: number;
  }> {
    const response = await api.post(`/scripts/${scriptId}/test`, { input: testInput });
    return response.data as {
      response: string;
      confidence: number;
      processingTime: number;
    };
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
    const response = await api.get(`/scripts/${scriptId}/analytics`, {
      params: dateRange
    });
    return response.data as {
      totalUsage: number;
      successRate: number;
      averageConfidence: number;
      averageResponseTime: number;
      usageByDay: Array<{ date: string; count: number }>;
      sentimentDistribution: Array<{ sentiment: string; count: number }>;
    };
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
    const response = await api.get(`/scripts/${scriptId}/versions`);
    return response.data as Array<{
      id: string;
      version: number;
      content: string;
      createdAt: string;
      createdBy: string;
      isActive: boolean;
    }>;
  }

  /**
   * Revert to a specific script version
   */
  static async revertToVersion(scriptId: string, versionId: string): Promise<Script> {
    const response = await api.post(`/scripts/${scriptId}/revert`, { versionId });
    return response.data as Script;
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
    const response = await api.get('/scripts/templates');
    return response.data as Array<{
      id: string;
      name: string;
      description: string;
      type: ScriptType;
      content: string;
      category: string;
    }>;
  }

  /**
   * Create script from template
   */
  static async createFromTemplate(templateId: string, name: string): Promise<Script> {
    const response = await api.post('/scripts/from-template', { templateId, name });
    return response.data as Script;
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
    const response = await api.post('/scripts/validate', { content, type });
    return response.data as {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      suggestions: string[];
    };
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
    const response = await api.get(`/scripts/${scriptId}/usage`);
    return response.data as {
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      averageRating: number;
      lastUsed: string;
      campaignsUsing: Array<{ id: string; name: string }>;
    };
  }

  /**
   * Export script
   */
  static async exportScript(scriptId: string, format: 'json' | 'txt' = 'json'): Promise<Blob> {
    const response = await api.get(`/scripts/${scriptId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  /**
   * Import script
   */
  static async importScript(file: File): Promise<Script> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/scripts/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data as Script;
  }
}
