import apiClient from '@/lib/api';
import { CRMIntegrationStatus, Customer, Lead } from '@/types';

export class CRMService {
  // Get CRM integration status
  static async getCRMStatus(): Promise<CRMIntegrationStatus> {
    const response = await apiClient.get<CRMIntegrationStatus>('/crm/status');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch CRM status');
  }

  // Sync call to CRM
  static async syncCallToCRM(callId: string, crmType: string = 'all'): Promise<unknown> {
    const response = await apiClient.post<unknown>('/crm/sync-call', {
      callId,
      crmType,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to sync call to CRM');
  }

  // Get customer from CRM
  static async getCustomerFromCRM(email: string, crmType: string = 'auto'): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/crm/customer/${email}`, {
      params: { crmType }
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get customer from CRM');
  }

  // Create lead from call
  static async createLeadFromCall(callId: string, crmType: string = 'auto'): Promise<Lead> {
    const response = await apiClient.post<Lead>('/crm/create-lead', {
      callId,
      crmType,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to create lead from call');
  }

  // Refresh Salesforce token
  static async refreshSalesforceToken(): Promise<void> {
    const response = await apiClient.post('/crm/salesforce/refresh-token');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to refresh Salesforce token');
    }
  }

  // Bulk sync calls to CRM
  static async bulkSyncCalls(callIds: string[], crmType: string = 'all'): Promise<unknown> {
    const response = await apiClient.post<unknown>('/crm/bulk-sync', {
      callIds,
      crmType,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to perform bulk CRM sync');
  }
}
