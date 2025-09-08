import apiClient from '@/lib/api';
import { DashboardAnalytics } from '@/types';

// Demo analytics data
const DEMO_ANALYTICS: DashboardAnalytics = {
  overview: {
    totalCalls: 1247,
    resolvedCalls: 1089,
    escalatedCalls: 158,
    avgCallDuration: 342,
    resolutionRate: 0.87
  },
  callVolume: {
    today: 45,
    yesterday: 38,
    thisWeek: 287,
    lastWeek: 251
  },
  hourlyDistribution: [
    { hour: 9, calls: 12 },
    { hour: 10, calls: 18 },
    { hour: 11, calls: 25 },
    { hour: 12, calls: 22 },
    { hour: 13, calls: 15 },
    { hour: 14, calls: 28 },
    { hour: 15, calls: 31 },
    { hour: 16, calls: 24 },
    { hour: 17, calls: 19 }
  ],
  sentimentTrends: [
    { date: '2024-01-15', positive: 65, neutral: 25, negative: 10 },
    { date: '2024-01-16', positive: 70, neutral: 22, negative: 8 },
    { date: '2024-01-17', positive: 68, neutral: 24, negative: 8 },
    { date: '2024-01-18', positive: 72, neutral: 20, negative: 8 },
    { date: '2024-01-19', positive: 75, neutral: 18, negative: 7 }
  ]
};

// Check if we're in demo mode
function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('voxassist_demo_mode') === 'true';
}

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
