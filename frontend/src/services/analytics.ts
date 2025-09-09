import apiClient from '@/lib/api';
import { DashboardAnalytics } from '@/types';
import { DEMO_ANALYTICS, isDemoMode } from '@/demo';

export class AnalyticsService {
  // Get dashboard analytics
  static async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    if (isDemoMode()) {
      // Return demo analytics data
      return Promise.resolve(DEMO_ANALYTICS);
    }

    const response = await apiClient.get<DashboardAnalytics>('/analytics/dashboard');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch dashboard analytics');
  }

  // Get call volume analytics
  static async getCallVolumeAnalytics(startDate: string, endDate: string): Promise<unknown> {
    const response = await apiClient.get<unknown>('/analytics/call-volume', {
      params: { startDate, endDate }
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch call volume analytics');
  }

  // Get sentiment analytics
  static async getSentimentAnalytics(startDate: string, endDate: string): Promise<unknown> {
    const response = await apiClient.get<unknown>('/analytics/sentiment', {
      params: { startDate, endDate }
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch sentiment analytics');
  }

  // Get performance metrics
  static async getPerformanceAnalytics(startDate: string, endDate: string): Promise<unknown> {
    const response = await apiClient.get<unknown>('/analytics/performance', {
      params: { startDate, endDate }
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch performance metrics');
  }

  // Export analytics data
  static async exportAnalytics(type: string, startDate: string, endDate: string): Promise<Blob> {
    const response = await apiClient.get(`/analytics/export/${type}`, {
      params: { startDate, endDate },
      responseType: 'blob'
    });
    
    if (response.data) {
      return response.data as unknown as Blob;
    }
    
    throw new Error('Failed to export analytics data');
  }
}
