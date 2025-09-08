import api from '@/lib/api';

export interface SupportTopic {
  id: string;
  name: string;
  keywords: string[];
  responseScript: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  condition: {
    type: 'keyword' | 'sentiment';
    value: string;
  };
  action: 'handoff' | 'alert';
}

// --- Support Topics API ---

const getSupportTopics = async (): Promise<SupportTopic[]> => {
  const response = await api.get<SupportTopic[]>('/settings/support-topics');
  return response.data || [];
};

const createSupportTopic = async (topic: Omit<SupportTopic, 'id'>): Promise<SupportTopic> => {
  const response = await api.post<SupportTopic>('/settings/support-topics', topic);
  if (!response.data) throw new Error('Failed to create support topic.');
  return response.data;
};

const updateSupportTopic = async (id: string, topic: Partial<SupportTopic>): Promise<SupportTopic> => {
  const response = await api.put<SupportTopic>(`/settings/support-topics/${id}`, topic);
  if (!response.data) throw new Error('Failed to update support topic.');
  return response.data;
};

const deleteSupportTopic = async (id: string): Promise<void> => {
  await api.delete(`/settings/support-topics/${id}`);
};

// --- Escalation Rules API ---

const getEscalationRules = async (): Promise<EscalationRule[]> => {
  const response = await api.get<EscalationRule[]>('/settings/escalation-rules');
  return response.data || [];
};

const createEscalationRule = async (rule: Omit<EscalationRule, 'id'>): Promise<EscalationRule> => {
  const response = await api.post<EscalationRule>('/settings/escalation-rules', rule);
  if (!response.data) throw new Error('Failed to create escalation rule.');
  return response.data;
};

const updateEscalationRule = async (id: string, rule: Partial<EscalationRule>): Promise<EscalationRule> => {
  const response = await api.put<EscalationRule>(`/settings/escalation-rules/${id}`, rule);
  if (!response.data) throw new Error('Failed to update escalation rule.');
  return response.data;
};

const deleteEscalationRule = async (id: string): Promise<void> => {
  await api.delete(`/settings/escalation-rules/${id}`);
};

export const SettingsService = {
  getSupportTopics,
  createSupportTopic,
  updateSupportTopic,
  deleteSupportTopic,
  getEscalationRules,
  createEscalationRule,
  updateEscalationRule,
  deleteEscalationRule,
};
