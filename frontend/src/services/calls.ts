import apiClient from '@/lib/api';
import { Call, AIResponse } from '@/types';

export class CallsService {
  // Get all calls
  static async getCalls(): Promise<Call[]> {
    const response = await apiClient.get<Call[]>('/calls');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch calls');
  }

  static async getCall(callId: string): Promise<Call> {
    const response = await apiClient.get<Call>(`/calls/${callId}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch call');
  }

  static async initiateCall(phoneNumber: string, options?: { callbackUrl?: string; enableAdvancedAnalysis?: boolean }): Promise<Call> {
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
    const response = await apiClient.post(`/calls/${callId}/end`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to end call');
    }
  }

  // Demo call methods for testing
  static async startDemoCall(): Promise<Call> {
    const response = await apiClient.post<Call>('/calls/demo/start');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to start demo call');
  }

  static async endDemoCall(callId: string): Promise<void> {
    const response = await apiClient.post(`/calls/demo/${callId}/end`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to end demo call');
    }
  }

  static async processVoiceInput(callId: string, audioBlob: Blob, analysis: Record<string, unknown>): Promise<{
    transcript: string;
    confidence: number;
    sentiment: string;
    sentimentData: Record<string, unknown>;
    aiResponse: string;
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-input.webm');
    formData.append('analysis', JSON.stringify(analysis));

    const response = await apiClient.post(`/calls/demo/${callId}/voice`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.success && response.data) {
      const data = response.data as Record<string, unknown>;
      return {
        transcript: (data.transcript as string) || '',
        confidence: (data.confidence as number) || 0,
        sentiment: (data.sentiment as string) || 'neutral',
        sentimentData: (data.sentimentData as Record<string, unknown>) || {},
        aiResponse: (data.aiResponse as string) || ''
      };
    }

    throw new Error(response.error || 'Failed to process voice input');
  }

  static async handoffToHuman(callId: string): Promise<void> {
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

