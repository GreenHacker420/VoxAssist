import apiClient from '@/lib/api';
import { Call, CallDetails, AIResponse } from '@/types';

// Demo data for demo mode
const DEMO_CALLS: Call[] = [
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
  }
];

// Check if we're in demo mode
function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('voxassist_demo_mode') === 'true';
}

export class CallsService {
  // Get all calls
  static async getCalls(): Promise<Call[]> {
    if (isDemoMode()) {
      // Return demo data in demo mode
      return Promise.resolve(DEMO_CALLS);
    }

    const response = await apiClient.get<Call[]>('/calls');
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch calls');
  }

  static async getCall(callId: string): Promise<Call> {
    if (isDemoMode()) {
      // Return demo call data
      const demoCall = DEMO_CALLS.find(call => call.id === callId);
      if (demoCall) {
        return Promise.resolve(demoCall);
      }
      throw new Error('Demo call not found');
    }

    const response = await apiClient.get<Call>(`/calls/${callId}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch call');
  }

  static async initiateCall(phoneNumber: string, options?: { callbackUrl?: string; enableAdvancedAnalysis?: boolean }): Promise<Call> {
    if (isDemoMode()) {
      // Create a new demo call
      const demoCall: Call = {
        id: `demo-call-${Date.now()}`,
        customerPhone: phoneNumber,
        status: 'active',
        startTime: new Date().toISOString(),
        sentiment: 'neutral',
        sentimentScore: 0.5,
        callSid: `demo-sid-${Date.now()}`,
        transcript: 'Demo call initiated. This is a simulated call for demonstration purposes.',
        aiInsights: 'Demo call with advanced analysis enabled: ' + (options?.enableAdvancedAnalysis ? 'Yes' : 'No')
      };
      
      // Add to demo calls array
      DEMO_CALLS.unshift(demoCall);
      
      return Promise.resolve(demoCall);
    }

    const response = await apiClient.post<Call>('/calls/initiate', {
      phoneNumber,
      callbackUrl: options?.callbackUrl,
      enableAdvancedAnalysis: options?.enableAdvancedAnalysis,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to initiate call');
  }

  static async endCall(callId: string): Promise<void> {
    if (isDemoMode()) {
      // Update demo call status
      const callIndex = DEMO_CALLS.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        DEMO_CALLS[callIndex].status = 'completed';
        DEMO_CALLS[callIndex].endTime = new Date().toISOString();
        DEMO_CALLS[callIndex].duration = Math.floor((new Date().getTime() - new Date(DEMO_CALLS[callIndex].startTime).getTime()) / 1000);
      }
      return Promise.resolve();
    }

    const response = await apiClient.post(`/calls/${callId}/end`, {});

    if (!response.success) {
      throw new Error(response.error || 'Failed to end call');
    }
  }

  static async handoffToHuman(callId: string): Promise<void> {
    if (isDemoMode()) {
      // Update demo call status
      const callIndex = DEMO_CALLS.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        DEMO_CALLS[callIndex].status = 'escalated';
        DEMO_CALLS[callIndex].escalated = true;
      }
      return Promise.resolve();
    }

    const response = await apiClient.post(`/calls/${callId}/handoff`, {});

    if (!response.success) {
      throw new Error(response.error || 'Failed to handoff call to human');
    }
  }

  static async processAIResponse(callId: string, query: string, context?: unknown): Promise<AIResponse> {
    const response = await apiClient.post<AIResponse>(`/calls/${callId}/ai-response`, {
      query,
      context,
    });

    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to process AI response');
  }

  // Get call transcript
  static async getCallTranscript(callId: string): Promise<unknown> {
    const response = await apiClient.get<unknown>(`/calls/${callId}/transcript`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch transcript');
  }

  // Update call sentiment
  static async updateCallSentiment(callId: string, sentiment: string, confidence?: number): Promise<unknown> {
    const response = await apiClient.post<unknown>(`/calls/${callId}/sentiment`, {
      sentiment,
      confidence,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update sentiment');
  }
}
