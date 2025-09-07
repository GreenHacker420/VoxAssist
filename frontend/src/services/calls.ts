import apiClient from '@/lib/api';
import { Call, CallDetails, AIResponse, ApiResponse } from '@/types';

export class CallsService {
  // Get all calls
  static async getCalls(): Promise<Call[]> {
    const response = await apiClient.get<Call[]>('/calls');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch calls');
  }

  // Get specific call details
  static async getCallDetails(callId: string): Promise<CallDetails> {
    const response = await apiClient.get<CallDetails>(`/calls/${callId}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch call details');
  }

  // Initiate a new call
  static async initiateCall(phoneNumber: string, callbackUrl?: string): Promise<Call> {
    const response = await apiClient.post<Call>('/calls/initiate', {
      phoneNumber,
      callbackUrl,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to initiate call');
  }

  // End a call
  static async endCall(callId: string): Promise<void> {
    const response = await apiClient.post(`/calls/${callId}/end`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to end call');
    }
  }

  // Process AI response for a call
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
  static async getCallTranscript(callId: string, format?: string): Promise<unknown> {
    const response = await apiClient.get<unknown>(`/calls/${callId}/transcript`, {});
    
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
