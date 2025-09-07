import api from '@/lib/api';

export interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
  currency: string;
  features: string[];
}

export interface Invoice {
  id: string;
  number: string;
  status: 'paid' | 'pending' | 'failed';
  amount: number;
  currency: string;
  date: string;
  dueDate: string;
  downloadUrl?: string;
}

export interface BillingUsage {
  callsUsed: number;
  callsLimit: number;
  storageUsed: number;
  storageLimit: number;
  period: {
    start: string;
    end: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export class BillingService {
  /**
   * Get current subscription
   */
  static async getSubscription(): Promise<Subscription> {
    const response = await api.get('/billing/subscription');
    return response.data as Subscription;
  }

  /**
   * Get available plans
   */
  static async getPlans(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    callsLimit: number;
    storageLimit: number;
  }>> {
    const response = await api.get('/billing/plans');
    return response.data as Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      interval: 'month' | 'year';
      features: string[];
      callsLimit: number;
      storageLimit: number;
    }>;
  }

  /**
   * Subscribe to a plan
   */
  static async subscribeToPlan(planId: string, paymentMethodId?: string): Promise<Subscription> {
    const response = await api.post('/billing/subscribe', { planId, paymentMethodId });
    return response.data as Subscription;
  }

  /**
   * Update subscription
   */
  static async updateSubscription(planId: string): Promise<Subscription> {
    const response = await api.put('/billing/subscription', { planId });
    return response.data as Subscription;
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(cancelAtPeriodEnd = true): Promise<Subscription> {
    const response = await api.post('/billing/subscription/cancel', { cancelAtPeriodEnd });
    return response.data as Subscription;
  }

  /**
   * Reactivate subscription
   */
  static async reactivateSubscription(): Promise<Subscription> {
    const response = await api.post('/billing/subscription/reactivate');
    return response.data as Subscription;
  }

  /**
   * Get invoices
   */
  static async getInvoices(page: number = 1, limit: number = 20): Promise<{
    invoices: Invoice[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get('/billing/invoices', {
      params: { page, limit }
    });
    return response.data as {
      invoices: Invoice[];
      total: number;
      page: number;
      totalPages: number;
    };
  }

  /**
   * Get specific invoice
   */
  static async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await api.get(`/billing/invoices/${invoiceId}`);
    return response.data as Invoice;
  }

  /**
   * Download invoice
   */
  static async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await api.get(`/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  /**
   * Get usage statistics
   */
  static async getUsage(): Promise<BillingUsage> {
    const response = await api.get('/billing/usage');
    return response.data as BillingUsage;
  }

  /**
   * Get payment methods
   */
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get('/billing/payment-methods');
    return response.data as PaymentMethod[];
  }

  /**
   * Add payment method
   */
  static async addPaymentMethod(paymentMethodData: {
    type: 'card';
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvc: string;
    holderName: string;
  }): Promise<PaymentMethod> {
    const response = await api.post('/billing/payment-methods', paymentMethodData);
    return response.data as PaymentMethod;
  }

  /**
   * Update payment method
   */
  static async updatePaymentMethod(paymentMethodId: string, updates: {
    expiryMonth?: number;
    expiryYear?: number;
    holderName?: string;
  }): Promise<PaymentMethod> {
    const response = await api.put(`/billing/payment-methods/${paymentMethodId}`, updates);
    return response.data as PaymentMethod;
  }

  /**
   * Delete payment method
   */
  static async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await api.delete(`/billing/payment-methods/${paymentMethodId}`);
  }

  /**
   * Set default payment method
   */
  static async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const response = await api.post(`/billing/payment-methods/${paymentMethodId}/set-default`);
    return response.data as PaymentMethod;
  }

  /**
   * Get billing history
   */
  static async getBillingHistory(startDate?: string, endDate?: string): Promise<Array<{
    id: string;
    type: 'charge' | 'refund' | 'adjustment';
    amount: number;
    currency: string;
    description: string;
    date: string;
    status: string;
  }>> {
    const response = await api.get('/billing/history', {
      params: { startDate, endDate }
    });
    return response.data as Array<{
      id: string;
      type: 'charge' | 'refund' | 'adjustment';
      amount: number;
      currency: string;
      description: string;
      date: string;
      status: string;
    }>;
  }

  /**
   * Create billing portal session
   */
  static async createPortalSession(returnUrl: string): Promise<{ url: string }> {
    const response = await api.post('/billing/portal-session', { returnUrl });
    return response.data as { url: string };
  }

  /**
   * Get upcoming invoice
   */
  static async getUpcomingInvoice(): Promise<{
    amount: number;
    currency: string;
    date: string;
    items: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  }> {
    const response = await api.get('/billing/upcoming-invoice');
    return response.data as {
      amount: number;
      currency: string;
      date: string;
      items: Array<{
        description: string;
        amount: number;
        quantity: number;
      }>;
    };
  }
}
