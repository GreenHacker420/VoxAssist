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
          demoCallsData[callIndex].status = nextState === 'ended' ? 'completed' :
                                                    nextState === 'connecting' ? 'active' :
                                                    nextState as 'active' | 'completed' | 'escalated' | 'failed' | 'initiated' | 'ringing';

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

  // Interactive demo call with real-time features
  static async initiateInteractiveDemoCall(): Promise<Call> {
    if (isDemoMode()) {
      // Use backend API for demo calls to get real-time features
      try {
        console.log('Initiating interactive demo call via backend API...');
        const response = await apiClient.post<Call>('/demo-calls', {
          template: 'CUSTOMER_SUPPORT'
        });

        console.log('Demo call API response:', response);

        if (response.success && response.data) {
          const demoCall = response.data;

          // Add to local demo data for consistency
          demoCallsData.unshift({
            ...demoCall,
            transcript: '',
            aiInsights: 'Interactive demo call in progress'
          });

          // Emit real-time event for demo call start
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demo-call-started', {
              detail: { call: demoCall }
            }));
          }

          return demoCall;
        }

        throw new Error(response.error || 'Failed to start demo call');
      } catch (error) {
        console.warn('Backend demo call failed, falling back to frontend simulation:', error);

        // Fallback to frontend simulation
        const interactiveDemoCall: Call = {
          id: `interactive-demo-${Date.now()}`,
          customerName: 'Demo User',
          customerEmail: 'demo.user@example.com',
          customerPhone: '+1-555-DEMO',
          status: 'active',
          startTime: new Date().toISOString(),
          sentiment: 'neutral',
          sentimentScore: 0.5,
          callSid: `interactive-demo-sid-${Date.now()}`,
          transcript: '',
          aiInsights: JSON.stringify({
            summary: 'Interactive demo call in progress',
            keyTopics: ['Demo', 'Real-time Features', 'Sentiment Analysis'],
            actionItems: [],
            escalationRecommended: false,
            customerSatisfaction: 0.8
          })
        };

        demoCallsData.unshift(interactiveDemoCall);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('demo-call-started', {
            detail: { call: interactiveDemoCall }
          }));
        }

        return Promise.resolve(interactiveDemoCall);
      }
    }

    throw new Error('Interactive demo call only available in demo mode');
  }

  // Update demo call with real-time transcript
  static async updateDemoCallTranscript(callId: string, transcriptEntry: unknown): Promise<void> {
    if (isDemoMode()) {
      const callIndex = demoCallsData.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        // Parse existing transcript or initialize as empty array
        let transcriptArray = [];
        try {
          transcriptArray = demoCallsData[callIndex].transcript ?
            JSON.parse(demoCallsData[callIndex].transcript!) : [];
        } catch {
          transcriptArray = [];
        }

        // Add new entry
        transcriptArray.push(transcriptEntry);

        // Store back as JSON string
        demoCallsData[callIndex].transcript = JSON.stringify(transcriptArray);

        // Emit real-time event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('demo-call-transcript-update', {
            detail: { callId, transcriptEntry }
          }));
        }
      }
      return Promise.resolve();
    }

    throw new Error('Demo call transcript update only available in demo mode');
  }

  // End demo call
  static async endDemoCall(callId: string): Promise<void> {
    if (isDemoMode()) {
      try {
        // Try to end demo call via backend API
        const response = await apiClient.delete(`/demo-calls/${callId}`);

        if (response.success) {
          // Update local data
          const callIndex = demoCallsData.findIndex(call => call.id === callId);
          if (callIndex !== -1) {
            demoCallsData[callIndex].status = 'completed';
            demoCallsData[callIndex].endTime = new Date().toISOString();
          }

          // Emit real-time event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demo-call-ended', {
              detail: { callId, call: demoCallsData[callIndex] }
            }));
          }

          return Promise.resolve();
        }

        throw new Error(response.error || 'Failed to end demo call');
      } catch (error) {
        console.warn('Backend demo call end failed, using frontend fallback:', error);

        // Fallback to frontend handling
        const callIndex = demoCallsData.findIndex(call => call.id === callId);
        if (callIndex !== -1) {
          demoCallsData[callIndex].status = 'completed';
          demoCallsData[callIndex].endTime = new Date().toISOString();

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demo-call-ended', {
              detail: { callId, call: demoCallsData[callIndex] }
            }));
          }
        }
        return Promise.resolve();
      }
    }

    throw new Error('Demo call end only available in demo mode');
  }

  // Get demo call details from backend
  static async getDemoCall(callId: string): Promise<Call> {
    if (isDemoMode()) {
      try {
        const response = await apiClient.get<Call>(`/demo-calls/${callId}`);

        if (response.success && response.data) {
          return response.data;
        }

        throw new Error(response.error || 'Failed to fetch demo call');
      } catch (error) {
        console.warn('Backend demo call fetch failed, using frontend fallback:', error);

        // Fallback to frontend data
        const demoCall = demoCallsData.find(call => call.id === callId);
        if (demoCall) {
          return Promise.resolve(demoCall);
        }
        throw new Error('Demo call not found');
      }
    }

    throw new Error('Demo call fetch only available in demo mode');
  }
}
