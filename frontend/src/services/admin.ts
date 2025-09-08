import api from '@/lib/api';
import type { 
  User,
  AuditLog,
  SystemMetrics,
  AdminSettings
} from '@/types';

export type { SystemMetrics };

export interface AdminUser extends User {
  lastLogin?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription?: {
    plan: string;
    status: string;
    expiresAt: string;
  };
  usage: {
    callsThisMonth: number;
    storageUsed: number;
  };
}


export class AdminService {
  /**
   * Get all users with admin details
   */
  static async getUsers(page = 1, limit = 20, search?: string): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get<{
      users: AdminUser[];
      total: number;
      page: number;
      totalPages: number;
    }>('/admin/users', {
      params: { page, limit, search }
    });
    return response.data!;
  }

  /**
   * Get specific user details
   */
  static async getUser(userId: string): Promise<AdminUser> {
    const response = await api.get<AdminUser>(`/admin/users/${userId}`);
    return response.data!;
  }

  /**
   * Update user status
   */
  static async updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<AdminUser> {
    const response = await api.patch<AdminUser>(`/admin/users/${userId}/status`, { status });
    return response.data!;
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: string): Promise<void> {
    await api.delete<void>(`/admin/users/${userId}`);
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await api.get<SystemMetrics>('/admin/metrics');
    return response.data!;
  }

  /**
   * Get system settings
   */
  static async getSettings(): Promise<AdminSettings[]> {
    const response = await api.get<AdminSettings[]>('/admin/settings');
    return response.data!;
  }

  /**
   * Update system setting
   */
  static async updateSetting(settingId: string, value: string): Promise<AdminSettings> {
    const response = await api.put<AdminSettings>(`/admin/settings/${settingId}`, { value });
    return response.data!;
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(page = 1, limit = 20, userId?: string): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get<{
      logs: AuditLog[];
      total: number;
      page: number;
      totalPages: number;
    }>('/admin/audit-logs', {
      params: { page, limit, userId }
    });
    return response.data!;
  }

  /**
   * Get system health
   */
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    services: Array<{
      name: string;
      status: 'up' | 'down' | 'degraded';
      responseTime: number;
      lastCheck: string;
    }>;
    alerts: Array<{
      id: string;
      level: 'info' | 'warning' | 'error';
      message: string;
      createdAt: string;
    }>;
  }> {
    const response = await api.get('/admin/health');
    return response.data as {
      status: 'healthy' | 'warning' | 'critical';
      services: Array<{
        name: string;
        status: 'up' | 'down' | 'degraded';
        responseTime: number;
        lastCheck: string;
      }>;
      alerts: Array<{
        id: string;
        level: 'info' | 'warning' | 'error';
        message: string;
        createdAt: string;
      }>;
    };
  }

  /**
   * Export user data
   */
  static async exportUsers(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await api.get('/admin/users/export', {
      params: { format },
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  /**
   * Send system notification
   */
  static async sendNotification(notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    userIds?: string[];
    broadcast?: boolean;
  }): Promise<void> {
    await api.post('/admin/notifications', notification);
  }

  /**
   * Get system statistics
   */
  static async getStatistics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    users: {
      total: number;
      new: number;
      active: number;
      churn: number;
    };
    calls: {
      total: number;
      successful: number;
      failed: number;
      averageDuration: number;
    };
    revenue: {
      total: number;
      recurring: number;
      oneTime: number;
      growth: number;
    };
    usage: {
      storageUsed: number;
      bandwidthUsed: number;
      apiCalls: number;
    };
  }> {
    const response = await api.get('/admin/statistics', {
      params: { period }
    });
    return response.data as {
      users: {
        total: number;
        new: number;
        active: number;
        churn: number;
      };
      calls: {
        total: number;
        successful: number;
        failed: number;
        averageDuration: number;
      };
      revenue: {
        total: number;
        recurring: number;
        oneTime: number;
        growth: number;
      };
      usage: {
        storageUsed: number;
        bandwidthUsed: number;
        apiCalls: number;
      };
    };
  }
}
