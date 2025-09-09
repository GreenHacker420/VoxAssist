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
  }
};
