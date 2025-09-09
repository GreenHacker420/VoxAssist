import apiClient from '@/lib/api';
import { Call, AIResponse } from '@/types';
import { 
  DEMO_CALLS, 
  DEMO_CALL_TEMPLATES, 
  isDemoMode, 
  DEMO_CONFIG 
} from '@/demo';

// Mutable demo calls array for runtime modifications
const demoCallsData = [...DEMO_CALLS];

export class CallsService {
  // Get all calls
  static async getCalls(): Promise<Call[]> {
    if (isDemoMode()) {
      // Return demo data in demo mode
      return Promise.resolve(demoCallsData);
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
      const demoCall = demoCallsData.find(call => call.id === callId);
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
      const isSelfCall = phoneNumber === DEMO_CONFIG.SELF_CALL_NUMBER;
      const template = isSelfCall ? DEMO_CALL_TEMPLATES.SELF_DEMO : DEMO_CALL_TEMPLATES.REGULAR_DEMO;
      
      // Create a new demo call
      const demoCall: Call = {
        id: `demo-call-${Date.now()}`,
        customerName: template.customerName || `Customer ${phoneNumber}`,
        customerEmail: template.customerEmail || `customer@example.com`,
        customerPhone: phoneNumber,
        status: 'active',
        startTime: new Date().toISOString(),
        sentiment: template.sentiment,
        sentimentScore: template.sentimentScore,
        callSid: `demo-sid-${Date.now()}`,
        transcript: template.transcript,
        aiInsights: template.aiInsights + (options?.enableAdvancedAnalysis ? ' (Advanced Analysis Enabled)' : '')
      };
      
      // Add to demo calls array
      demoCallsData.unshift(demoCall);
      
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
      const callIndex = demoCallsData.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        demoCallsData[callIndex].status = 'completed';
        demoCallsData[callIndex].endTime = new Date().toISOString();
        demoCallsData[callIndex].duration = Math.floor((new Date().getTime() - new Date(demoCallsData[callIndex].startTime).getTime()) / 1000);
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
      const callIndex = demoCallsData.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        demoCallsData[callIndex].status = 'escalated';
        demoCallsData[callIndex].escalated = true;
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
    if (isDemoMode()) {
      // Update demo call sentiment
      const callIndex = demoCallsData.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        demoCallsData[callIndex].sentiment = sentiment as 'positive' | 'neutral' | 'negative';
        demoCallsData[callIndex].sentimentScore = confidence || 0.5;
      }
      return Promise.resolve({ success: true });
    }

    const response = await apiClient.post<unknown>(`/calls/${callId}/sentiment`, {
      sentiment,
      confidence,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update sentiment');
  }

  // Self-calling demo feature
  static async initiateSelfDemoCall(): Promise<Call> {
    if (isDemoMode()) {
      const template = DEMO_CALL_TEMPLATES.SELF_DEMO;
      const selfDemoCall: Call = {
        id: `self-demo-${Date.now()}`,
        customerName: template.customerName || 'Demo User (Self)',
        customerEmail: template.customerEmail || 'demo@voxassist.com',
        customerPhone: template.customerPhone || DEMO_CONFIG.SELF_CALL_NUMBER,
        status: 'ringing',
        startTime: new Date().toISOString(),
        sentiment: 'neutral',
        sentimentScore: 0.5,
        callSid: `self-demo-sid-${Date.now()}`,
        transcript: 'Initiating self-demo call...',
        aiInsights: template.aiInsights
      };
      
      // Add to demo calls array
      demoCallsData.unshift(selfDemoCall);
      
      // Simulate realistic call progression
      this.simulateRealisticCallFlow(selfDemoCall.id);

      return Promise.resolve(selfDemoCall);
    }
    
    throw new Error('Self-demo call only available in demo mode');
  }

  // Simulate realistic call flow with state transitions
  private static simulateRealisticCallFlow(callId: string) {
    const call = demoCallsData.find(c => c.id === callId);
    if (!call) return;

    let currentStateIndex = 0;
    const states = ['ringing', 'connecting', 'active', 'ended'];
    const transcriptUpdates = [
      'Initiating self-demo call...',
      'Connecting to VoxAssist AI...',
      'Hello! Welcome to your VoxAssist self-demo. I\'m your AI assistant.',
      'This demo showcases our real-time conversation capabilities.',
      'You can see live transcription, sentiment analysis, and call controls.',
      'Thank you for trying VoxAssist! This concludes your demo call.'
    ];

    const progressToNextState = () => {
      if (currentStateIndex >= states.length - 1) return;

      const nextState = states[currentStateIndex + 1];
      const delay = currentStateIndex === 0 ? 3000 :
                   currentStateIndex === 1 ? 2000 :
                   currentStateIndex === 2 ? 30000 : 0; // 30s active time

      setTimeout(() => {
        const callIndex = demoCallsData.findIndex(c => c.id === callId);
        if (callIndex !== -1) {
          demoCallsData[callIndex].status = nextState as any;

          // Update transcript
          if (transcriptUpdates[currentStateIndex + 1]) {
            demoCallsData[callIndex].transcript = transcriptUpdates[currentStateIndex + 1];
          }

          // Update sentiment progressively
          if (nextState === 'active') {
            demoCallsData[callIndex].sentiment = 'positive';
            demoCallsData[callIndex].sentimentScore = 0.8;
          }

          // Set end time when call ends
          if (nextState === 'ended') {
            demoCallsData[callIndex].endTime = new Date().toISOString();
            demoCallsData[callIndex].duration = Math.floor(
              (new Date().getTime() - new Date(demoCallsData[callIndex].startTime).getTime()) / 1000
            );
          }

          // Trigger custom event for UI updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demoCallStateUpdate', {
              detail: { callId, newState: nextState, call: demoCallsData[callIndex] }
            }));
          }

          currentStateIndex++;
          progressToNextState();
        }
      }, delay);
    };

    progressToNextState();
  }

  // WhatsApp demo call
  static async initiateWhatsAppDemoCall(phoneNumber: string): Promise<Call> {
    if (isDemoMode()) {
      const template = DEMO_CALL_TEMPLATES.WHATSAPP_DEMO;
      const whatsappDemoCall: Call = {
        id: `whatsapp-demo-${Date.now()}`,
        customerName: `WhatsApp User ${phoneNumber}`,
        customerEmail: `whatsapp.user@example.com`,
        customerPhone: phoneNumber,
        status: 'active',
        startTime: new Date().toISOString(),
        sentiment: template.sentiment,
        sentimentScore: template.sentimentScore,
        callSid: `whatsapp-demo-sid-${Date.now()}`,
        transcript: template.transcript,
        aiInsights: template.aiInsights
      };
      
      demoCallsData.unshift(whatsappDemoCall);
      return Promise.resolve(whatsappDemoCall);
    }
    
    throw new Error('WhatsApp demo call only available in demo mode');
  }
}
