// User and Authentication Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'agent';
  organizationId?: number;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

// Call Types
export interface Call {
  id: string;
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: 'active' | 'completed' | 'escalated' | 'failed' | 'initiated';
  startTime: string;
  endTime?: string;
  duration?: number;
  organizationId?: number;
  crmSynced?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  callSid?: string;
  escalated?: boolean;
  transcript?: string;
  aiInsights?: string;
}

export interface CallDetails extends Omit<Call, 'transcript'> {
  recordings: Recording[];
  transcript: TranscriptEntry[];
  transcriptText?: string;
}

export interface Recording {
  id: string;
  callId: string;
  url: string;
  duration: number;
  createdAt: string;
}

export interface TranscriptEntry {
  id: string;
  callId: string;
  speaker: 'customer' | 'agent' | 'ai';
  text: string;
  timestamp: string;
  confidence?: number;
}

// AI Response Types
export interface AIResponse {
  response: string;
  intent: string;
  confidence: number;
  shouldEscalate: boolean;
  audioSize?: number;
}

// CRM Types
export interface CRMIntegrationStatus {
  salesforce: {
    connected: boolean;
    lastSync?: string;
  };
  hubspot: {
    connected: boolean;
    lastSync?: string;
  };
}

export interface Customer {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
}

export interface Lead extends Customer {
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  notes?: string;
  createdAt: string;
}

// Analytics Types
export interface DashboardAnalytics {
  overview: {
    totalCalls: number;
    resolvedCalls: number;
    escalatedCalls: number;
    avgCallDuration: number;
    resolutionRate: number;
  };
  callVolume: {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
  };
  hourlyDistribution: Array<{
    hour: number;
    calls: number;
  }>;
  sentimentTrends: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

// Campaign Types
export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  targetCount?: number;
  completedCount: number;
  successRate?: number;
  createdAt: string;
}

// Script/Prompt Types
export type ScriptType = 'greeting' | 'objection_handling' | 'closing' | 'escalation';

export interface Script {
  id: number;
  name: string;
  content: string;
  type: ScriptType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Webhook Types
export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
}

// Settings Types
export interface OrganizationSettings {
  id: number;
  name: string;
  timezone: string;
  businessHours: {
    start: string;
    end: string;
    days: string[];
  };
  voiceSettings: {
    voice: string;
    speed: number;
    pitch: number;
  };
  aiSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

// Billing Types
export interface Subscription {
  id: number;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface Usage {
  callMinutes: number;
  callMinutesLimit: number;
  apiCalls: number;
  apiCallsLimit: number;
  storage: number;
  storageLimit: number;
}

// Admin Types
export interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalCalls: number;
  callsToday: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  revenue?: {
    thisMonth: number;
    growth: number;
  };
}

export interface AdminSettings {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  updatedAt: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: number;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Real-time Event Types
export interface RealTimeEvent {
  type: 'call_started' | 'call_ended' | 'ai_response' | 'sentiment_update' | 'transcript_update';
  callId: string;
  data?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// Form Types
export interface FormErrors {
  [key: string]: string | undefined;
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean; }>;
  current?: boolean;
  children?: NavItem[];
}
