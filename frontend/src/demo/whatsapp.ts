export interface WhatsAppDemoConfig {
  id: string;
  provider: string;
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  businessAccountId: string;
  phoneNumber: string;
  verifiedName: string;
  isActive: boolean;
  status: 'connected' | 'disconnected';
}

export interface WhatsAppCallHistoryItem {
  id: string;
  phoneNumber: string;
  eventType: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export const DEMO_WHATSAPP_CONFIG: WhatsAppDemoConfig = {
  id: 'demo-whatsapp-1',
  provider: 'whatsapp',
  accessToken: 'demo_access_token_12345',
  phoneNumberId: 'demo_phone_id_67890',
  webhookVerifyToken: 'demo_webhook_token',
  businessAccountId: 'demo_business_account_123',
  phoneNumber: '+1-555-WHATSAPP',
  verifiedName: 'VoxAssist Demo Business',
  isActive: true,
  status: 'connected'
};

export const DEMO_WHATSAPP_CALL_HISTORY: WhatsAppCallHistoryItem[] = [
  {
    id: 'wa-call-1',
    phoneNumber: '+1-555-0123',
    eventType: 'call_initiated',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    metadata: {
      messageId: 'wamid.demo123',
      status: 'delivered',
      callDuration: 0
    }
  },
  {
    id: 'wa-call-2',
    phoneNumber: '+1-555-0456',
    eventType: 'call_delivered',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    metadata: {
      messageId: 'wamid.demo456',
      status: 'read',
      callDuration: 245
    }
  },
  {
    id: 'wa-call-3',
    phoneNumber: '+1-555-0789',
    eventType: 'incoming_call_accepted',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    metadata: {
      messageId: 'wamid.demo789',
      status: 'completed',
      callDuration: 387
    }
  },
  {
    id: 'wa-call-4',
    phoneNumber: '+1-555-0321',
    eventType: 'call_failed',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    metadata: {
      messageId: 'wamid.demo321',
      status: 'failed',
      error: 'User not available',
      callDuration: 0
    }
  },
  {
    id: 'wa-call-5',
    phoneNumber: '+1-555-0654',
    eventType: 'call_read',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    metadata: {
      messageId: 'wamid.demo654',
      status: 'read',
      callDuration: 156
    }
  }
];

export const DEMO_WHATSAPP_TEMPLATES = {
  CALL_INVITATION: {
    headerText: 'Voice Call Request',
    bodyText: 'Click to start voice call with our support team',
    footerText: 'Powered by VoxAssist'
  },
  CALL_MESSAGE: {
    headerText: 'Voice Call Available',
    bodyText: 'We are ready to assist you via voice call.',
    languageCode: 'en_US'
  },
  SUPPORT_CALL: {
    headerText: '🎧 Customer Support',
    bodyText: 'Need help? Start a voice call with our AI assistant for instant support.',
    footerText: 'Available 24/7 • Powered by VoxAssist'
  },
  SALES_CALL: {
    headerText: '💼 Sales Consultation',
    bodyText: 'Ready to learn more? Connect with our sales team via voice call.',
    footerText: 'Free consultation • Powered by VoxAssist'
  },
  TECHNICAL_CALL: {
    headerText: '🔧 Technical Support',
    bodyText: 'Experiencing technical issues? Get immediate help through voice call.',
    footerText: 'Expert assistance • Powered by VoxAssist'
  }
};

export const DEMO_WHATSAPP_ANALYTICS = {
  totalCalls: 1247,
  successfulCalls: 1089,
  failedCalls: 158,
  averageCallDuration: 245, // seconds
  callsByHour: [
    { hour: '00:00', calls: 12 },
    { hour: '01:00', calls: 8 },
    { hour: '02:00', calls: 5 },
    { hour: '03:00', calls: 3 },
    { hour: '04:00', calls: 7 },
    { hour: '05:00', calls: 15 },
    { hour: '06:00', calls: 28 },
    { hour: '07:00', calls: 45 },
    { hour: '08:00', calls: 67 },
    { hour: '09:00', calls: 89 },
    { hour: '10:00', calls: 102 },
    { hour: '11:00', calls: 95 },
    { hour: '12:00', calls: 87 },
    { hour: '13:00', calls: 92 },
    { hour: '14:00', calls: 98 },
    { hour: '15:00', calls: 105 },
    { hour: '16:00', calls: 89 },
    { hour: '17:00', calls: 76 },
    { hour: '18:00', calls: 54 },
    { hour: '19:00', calls: 42 },
    { hour: '20:00', calls: 35 },
    { hour: '21:00', calls: 28 },
    { hour: '22:00', calls: 22 },
    { hour: '23:00', calls: 18 }
  ],
  callOutcomes: [
    { outcome: 'Resolved', count: 892, percentage: 71.6 },
    { outcome: 'Escalated', count: 197, percentage: 15.8 },
    { outcome: 'Callback Requested', count: 89, percentage: 7.1 },
    { outcome: 'Failed to Connect', count: 69, percentage: 5.5 }
  ]
};
