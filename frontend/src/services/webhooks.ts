import api from '@/lib/api';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  description?: string;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'success' | 'failed' | 'pending';
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  createdAt: string;
  processedAt?: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: 'delivered' | 'failed' | 'retrying';
  httpStatus?: number;
  responseTime?: number;
  errorMessage?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export class WebhooksService {
  /**
   * Get all webhooks for the authenticated user
   */
  static async getWebhooks(): Promise<Webhook[]> {
    const response = await api.get('/webhooks');
    return response.data as Webhook[];
  }

  /**
   * Get a specific webhook by ID
   */
  static async getWebhook(webhookId: string): Promise<Webhook> {
    const response = await api.get(`/webhooks/${webhookId}`);
    return response.data as Webhook;
  }

  /**
   * Create a new webhook
   */
  static async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Webhook> {
    const response = await api.post('/webhooks', webhook);
    return response.data as Webhook;
  }

  /**
   * Update an existing webhook
   */
  static async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<Webhook> {
    const response = await api.patch(`/webhooks/${webhookId}`, updates);
    return response.data as Webhook;
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(webhookId: string): Promise<void> {
    await api.delete(`/webhooks/${webhookId}`);
  }

  /**
   * Test a webhook
   */
  static async testWebhook(webhookId: string, payload: Record<string, unknown>): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    errorMessage?: string;
  }> {
    const response = await api.post(`/webhooks/${webhookId}/test`, payload);
    return response.data as {
      success: boolean;
      statusCode?: number;
      responseTime?: number;
      errorMessage?: string;
    };
  }

  /**
   * Get webhook events/logs
   */
  static async getWebhookLogs(webhookId: string, page = 1, limit = 20): Promise<{
    logs: WebhookLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get(`/webhooks/${webhookId}/logs`, {
      params: { page, limit }
    });
    return response.data as {
      logs: WebhookLog[];
      total: number;
      page: number;
      totalPages: number;
    };
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(webhookId: string, dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    averageResponseTime: number;
    successRate: number;
    eventsByDay: Array<{ date: string; count: number; successCount: number }>;
    eventsByType: Array<{ event: string; count: number }>;
  }> {
    const response = await api.get(`/webhooks/${webhookId}/stats`, {
      params: dateRange
    });
    return response.data as {
      totalEvents: number;
      successfulEvents: number;
      failedEvents: number;
      averageResponseTime: number;
      successRate: number;
      eventsByDay: Array<{ date: string; count: number; successCount: number }>;
      eventsByType: Array<{ event: string; count: number }>;
    };
  }

  /**
   * Regenerate webhook secret
   */
  static async regenerateSecret(webhookId: string): Promise<{ secret: string }> {
    const response = await api.post(`/webhooks/${webhookId}/regenerate-secret`);
    return response.data as { secret: string };
  }

  /**
   * Get available webhook events
   */
  static async getAvailableEvents(): Promise<Array<{
    event: string;
    description: string;
    category: string;
    payloadExample: Record<string, unknown>;
  }>> {
    const response = await api.get('/webhooks/events');
    return response.data as Array<{
      event: string;
      description: string;
      category: string;
      payloadExample: Record<string, unknown>;
    }>;
  }

  /**
   * Retry failed webhook event
   */
  static async retryWebhookEvent(eventId: string): Promise<WebhookEvent> {
    const response = await api.post(`/webhooks/events/${eventId}/retry`);
    return response.data as WebhookEvent;
  }

  /**
   * Get webhook event details
   */
  static async getWebhookEvent(eventId: string): Promise<WebhookEvent> {
    const response = await api.get(`/webhooks/events/${eventId}`);
    return response.data as WebhookEvent;
  }

  /**
   * Cancel webhook event
   */
  static async cancelWebhookEvent(eventId: string): Promise<WebhookEvent> {
    const response = await api.post(`/webhooks/events/${eventId}/cancel`);
    return response.data as WebhookEvent;
  }

  /**
   * Validate webhook URL
   */
  static async validateWebhookUrl(url: string): Promise<{
    isValid: boolean;
    isReachable: boolean;
    responseTime?: number;
    errorMessage?: string;
  }> {
    const response = await api.post('/webhooks/validate-url', { url });
    return response.data as {
      isValid: boolean;
      isReachable: boolean;
      responseTime?: number;
      errorMessage?: string;
    };
  }

  /**
   * Get webhook delivery attempts
   */
  static async getDeliveryAttempts(eventId: string): Promise<Array<{
    id: string;
    attempt: number;
    status: 'success' | 'failed';
    httpStatus?: number;
    responseTime: number;
    errorMessage?: string;
    timestamp: string;
  }>> {
    const response = await api.get(`/webhooks/events/${eventId}/attempts`);
    return response.data as Array<{
      id: string;
      attempt: number;
      status: 'success' | 'failed';
      httpStatus?: number;
      responseTime: number;
      errorMessage?: string;
      timestamp: string;
    }>;
  }

  /**
   * Enable/disable webhook
   */
  static async toggleWebhook(webhookId: string, isActive: boolean): Promise<Webhook> {
    const response = await api.patch(`/webhooks/${webhookId}`, { isActive });
    return response.data as Webhook;
  }

  /**
   * Bulk operations on webhooks
   */
  static async bulkUpdateWebhooks(webhookIds: string[], updates: {
    isActive?: boolean;
    events?: string[];
  }): Promise<void> {
    await api.post('/webhooks/bulk-update', { webhookIds, updates });
  }

  /**
   * Export webhook logs
   */
  static async exportWebhookLogs(webhookId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await api.get(`/webhooks/${webhookId}/logs/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data as Blob;
  }
}
