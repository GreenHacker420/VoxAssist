import { Call } from '@/types';

export const DEMO_CALLS: Call[] = [
  {
    id: 'demo-call-1',
    customerName: 'John Smith',
    customerEmail: 'john.smith@example.com',
    customerPhone: '+1-555-0123',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3000000).toISOString(),
    duration: 600,
    sentiment: 'positive',
    sentimentScore: 0.8,
    callSid: 'demo-sid-1',
    transcript: 'Customer called about product inquiry. Resolved successfully.',
    aiInsights: 'Customer showed high interest in premium features.'
  },
  {
    id: 'demo-call-2',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.j@example.com',
    customerPhone: '+1-555-0456',
    status: 'active',
    startTime: new Date(Date.now() - 300000).toISOString(),
    sentiment: 'neutral',
    sentimentScore: 0.5,
    callSid: 'demo-sid-2',
    transcript: 'Ongoing support call regarding billing question.',
    aiInsights: 'Customer needs clarification on billing cycle.'
  },
  {
    id: 'demo-call-3',
    customerName: 'Demo User (Self)',
    customerEmail: 'demo@voxassist.com',
    customerPhone: '+1-555-DEMO',
    status: 'completed',
    startTime: new Date(Date.now() - 1800000).toISOString(),
    endTime: new Date(Date.now() - 1200000).toISOString(),
    duration: 600,
    sentiment: 'positive',
    sentimentScore: 0.9,
    callSid: 'demo-self-call',
    transcript: 'Self-demo call completed successfully with all features demonstrated.',
    aiInsights: 'Perfect demo call showcasing all VoxAssist capabilities.'
  },
  {
    id: 'demo-call-4',
    customerName: 'Emily Davis',
    customerEmail: 'emily.davis@example.com',
    customerPhone: '+1-555-0789',
    status: 'escalated',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 6600000).toISOString(),
    duration: 600,
    sentiment: 'negative',
    sentimentScore: 0.3,
    callSid: 'demo-sid-4',
    transcript: 'Customer expressed frustration with service. Escalated to human agent.',
    aiInsights: 'Customer requires immediate attention from senior support.',
    escalated: true
  },
  {
    id: 'demo-call-5',
    customerName: 'Michael Chen',
    customerEmail: 'michael.chen@example.com',
    customerPhone: '+1-555-0321',
    status: 'completed',
    startTime: new Date(Date.now() - 5400000).toISOString(),
    endTime: new Date(Date.now() - 4800000).toISOString(),
    duration: 600,
    sentiment: 'positive',
    sentimentScore: 0.85,
    callSid: 'demo-sid-5',
    transcript: 'Technical support call resolved with step-by-step guidance.',
    aiInsights: 'Customer was very satisfied with the technical assistance provided.'
  }
];

export const DEMO_CALL_TEMPLATES = {
  SELF_DEMO: {
    customerName: 'Demo User (Self)',
    customerEmail: 'demo@voxassist.com',
    customerPhone: '+1-555-DEMO',
    sentiment: 'positive' as const,
    sentimentScore: 0.9,
    transcript: 'Self-demo call to showcase VoxAssist features firsthand!',
    aiInsights: 'Self-demo call to showcase VoxAssist capabilities'
  },
  WHATSAPP_DEMO: {
    customerName: undefined,
    customerEmail: undefined,
    customerPhone: undefined,
    sentiment: 'positive' as const,
    sentimentScore: 0.8,
    transcript: 'WhatsApp demo call initiated successfully. Voice call through WhatsApp Business API.',
    aiInsights: 'WhatsApp integration demo - showing VoIP calling capabilities'
  },
  REGULAR_DEMO: {
    customerName: undefined,
    customerEmail: undefined,
    customerPhone: undefined,
    sentiment: 'neutral' as const,
    sentimentScore: 0.5,
    transcript: 'Demo call initiated. This is a simulated call for demonstration purposes.',
    aiInsights: 'Demo call with advanced analysis'
  }
};

export const DEMO_TRANSCRIPT_MESSAGES = [
  { speaker: 'customer', text: 'Hello, I need help with my account.', confidence: 0.95 },
  { speaker: 'ai', text: 'Hello! I\'d be happy to help you with your account. Can you please provide your account number?', confidence: 1.0 },
  { speaker: 'customer', text: 'Sure, it\'s 12345678.', confidence: 0.92 },
  { speaker: 'ai', text: 'Thank you. I can see your account here. What specific issue are you experiencing?', confidence: 1.0 },
  { speaker: 'customer', text: 'I can\'t access my online banking. It keeps saying my password is wrong.', confidence: 0.88 },
  { speaker: 'ai', text: 'I understand your frustration. Let me help you reset your password securely.', confidence: 1.0 },
  { speaker: 'customer', text: 'That would be great, thank you.', confidence: 0.94 },
  { speaker: 'ai', text: 'I\'ve sent a password reset link to your registered email. Please check your inbox.', confidence: 1.0 },
  { speaker: 'customer', text: 'Perfect! I got it and was able to reset my password. Thank you so much!', confidence: 0.96 },
  { speaker: 'ai', text: 'You\'re welcome! Is there anything else I can help you with today?', confidence: 1.0 },
  { speaker: 'customer', text: 'No, that\'s all. You\'ve been very helpful!', confidence: 0.98 }
];

export const DEMO_SENTIMENT_DATA = [
  { overall: 'neutral', score: 0.6, emotions: { joy: 0.1, anger: 0.2, fear: 0.3, sadness: 0.1, surprise: 0.3 } },
  { overall: 'positive', score: 0.7, emotions: { joy: 0.4, anger: 0.1, fear: 0.2, sadness: 0.1, surprise: 0.2 } },
  { overall: 'negative', score: 0.3, emotions: { joy: 0.1, anger: 0.4, fear: 0.2, sadness: 0.2, surprise: 0.1 } },
  { overall: 'positive', score: 0.8, emotions: { joy: 0.5, anger: 0.05, fear: 0.1, sadness: 0.05, surprise: 0.3 } },
  { overall: 'positive', score: 0.9, emotions: { joy: 0.6, anger: 0.02, fear: 0.08, sadness: 0.02, surprise: 0.28 } }
];

export const DEMO_CONFIG = {
  SELF_CALL_NUMBER: '+1-555-DEMO',
  DEMO_DURATION: 180, // 3 minutes
  SENTIMENT_UPDATE_INTERVAL: 5000, // 5 seconds
  TRANSCRIPT_UPDATE_INTERVAL: 3000, // 3 seconds
  CALL_STATES: ['ringing', 'connecting', 'active', 'on-hold', 'ended'] as const,
  REALISTIC_CALL_FLOW: {
    ringing: { duration: 3000, nextState: 'connecting' as const },
    connecting: { duration: 2000, nextState: 'active' as const },
    active: { duration: 120000, nextState: 'ended' as const }, // 2 minutes active
    'on-hold': { duration: 10000, nextState: 'active' as const },
    ended: { duration: 0, nextState: null }
  },
  SIMULATION_DELAYS: {
    CALL_CONNECT: 3000, // 3 seconds to connect
    STATE_TRANSITION: 2000, // 2 seconds between state changes
    TRANSCRIPT_UPDATE: 4000, // 4 seconds between transcript updates
    SENTIMENT_UPDATE: 6000 // 6 seconds between sentiment updates
  },
  CALL_CONTROLS: {
    mute: { available: true, label: 'Mute/Unmute' },
    hold: { available: true, label: 'Hold/Resume' },
    transfer: { available: true, label: 'Transfer Call' },
    record: { available: true, label: 'Start/Stop Recording' },
    hangup: { available: true, label: 'End Call' }
  }
};
