// Central export file for all demo data
export * from './calls';
export * from './analytics';
export * from './whatsapp';
export * from './widgets';

// Demo mode utility functions
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('voxassist_demo_mode') === 'true';
}

export function enableDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('voxassist_demo_mode', 'true');
  }
}

export function disableDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('voxassist_demo_mode');
  }
}

// Demo user data
export const DEMO_USER = {
  id: 999999,
  name: 'Demo User',
  email: 'demo@voxassist.com',
  role: 'user' as const,
  createdAt: new Date().toISOString()
};

// Demo configuration
export const DEMO_CONFIG = {
  SELF_CALL_NUMBER: '+1-555-DEMO',
  WHATSAPP_DEMO_NUMBER: '+1-555-WHATSAPP',
  SIMULATION_DELAYS: {
    CALL_CONNECT: 2000,
    MESSAGE_INTERVAL: 3000,
    SENTIMENT_UPDATE: 1000
  }
};
