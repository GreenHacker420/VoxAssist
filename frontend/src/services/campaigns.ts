import api from '@/lib/api';
import { Campaign } from '@/types';

export class CampaignsService {
  /**
   * Get all campaigns for the authenticated user
   */
  static async getAll(): Promise<Campaign[]> {
    const response = await api.get('/campaigns');
    return response.data as Campaign[];
  }

  /**
   * Get a specific campaign by ID
   */
  static async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${campaignId}`);
    return response.data as Campaign;
  }

  /**
   * Export a specific campaign by ID
   */
  static async exportCampaign(campaignId: string): Promise<Blob> {
    const response = await api.get(`/campaigns/${campaignId}/export`, {
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  /**
   * Create a new campaign
   */
  static async create(data: Partial<Campaign>): Promise<Campaign> {
    const response = await api.post('/campaigns', data);
    return response.data as Campaign;
  }

  /**
   * Update an existing campaign
   */
  static async updateCampaign(campaignId: string, campaignData: Partial<Campaign>): Promise<Campaign> {
    const response = await api.put(`/campaigns/${campaignId}`, campaignData);
    return response.data as Campaign;
  }

  /**
   * Delete a campaign
   */
  static async deleteCampaign(campaignId: string): Promise<void> {
    await api.delete(`/campaigns/${campaignId}`);
  }

  /**
   * Start a campaign
   */
  static async start(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/start`);
    return response.data as Campaign;
  }

  /**
   * Pause a campaign
   */
  static async pause(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/pause`);
    return response.data as Campaign;
  }

  /**
   * Resume a campaign
   */
  static async resume(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/resume`);
    return response.data as Campaign;
  }

  /**
   * Stop a campaign
   */
  static async stop(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/stop`);
    return response.data as Campaign;
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(campaignId: string): Promise<{
    totalCalls: number;
    completedCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageCallDuration: number;
    conversionRate: number;
  }> {
    const response = await api.get(`/campaigns/${campaignId}/stats`);
    return response.data as {
      totalCalls: number;
      completedCalls: number;
      successfulCalls: number;
      failedCalls: number;
      averageCallDuration: number;
      conversionRate: number;
    };
  }

  /**
   * Get campaign calls
   */
  static async getCampaignCalls(campaignId: string, page: number = 1, limit: number = 20): Promise<{
    calls: unknown[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get(`/campaigns/${campaignId}/calls`, {
      params: { page, limit }
    });
    return response.data as {
      calls: unknown[];
      total: number;
      page: number;
      totalPages: number;
    };
  }

  /**
   * Add contacts to a campaign
   */
  static async addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<void> {
    await api.post(`/campaigns/${campaignId}/contacts`, { contactIds });
  }

  /**
   * Remove contacts from a campaign
   */
  static async removeContactsFromCampaign(campaignId: string, contactIds: string[]): Promise<void> {
    await api.delete(`/campaigns/${campaignId}/contacts`, { data: { contactIds } });
  }

  /**
   * Get campaign contacts
   */
  static async getCampaignContacts(campaignId: string): Promise<unknown[]> {
    const response = await api.get(`/campaigns/${campaignId}/contacts`);
    return response.data as unknown[];
  }

  /**
   * Clone a campaign
   */
  static async cloneCampaign(campaignId: string, name: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${campaignId}/clone`, { name });
    return response.data as Campaign;
  }

  /**
   * Export campaign data
   */
  static async exportCampaignData(campaignId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await api.get(`/campaigns/${campaignId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data as Blob;
  }
}
