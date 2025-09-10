import api from '@/lib/api';

export interface WidgetDTO {
  id?: string;
  name: string;
  contextUrl?: string;
  organizationId?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  appearance: {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    borderRadius: string;
    size: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark' | 'auto';
  };
  behavior: {
    autoOpen: boolean;
    autoOpenDelay: number;
    greeting: string;
    language: string;
    enableVoice: boolean;
    enableText: boolean;
    enableFileUpload: boolean;
    showBranding: boolean;
  };
  permissions: {
    collectPersonalData: boolean;
    storeCookies: boolean;
    recordAudio: boolean;
    shareWithThirdParty: boolean;
    allowedDomains: string[];
  };
  advanced?: {
    customCSS: string;
    webhookUrl: string;
    analyticsEnabled: boolean;
    rateLimitEnabled: boolean;
    maxMessagesPerSession: number;
  };
}

export interface WidgetAnalyticsDTO {
  totalSessions: number;
  totalInteractions: number;
  avgSentimentScore: number;
}

const list = async (organizationId: number): Promise<WidgetDTO[]> => {
  const res = await api.get<WidgetDTO[]>(`/widgets`, { params: { organizationId } });
  return res.data || [];
};

const analytics = async (widgetId: string): Promise<WidgetAnalyticsDTO> => {
  const res = await api.get<WidgetAnalyticsDTO>(`/widgets/${widgetId}/analytics`);
  return res.data as WidgetAnalyticsDTO;
};

const create = async (organizationId: number, payload: WidgetDTO): Promise<WidgetDTO> => {
  const res = await api.post<WidgetDTO>(`/widgets`, { ...payload, organizationId });
  return res.data as WidgetDTO;
};

const update = async (widgetId: string, payload: Partial<WidgetDTO>): Promise<WidgetDTO> => {
  const res = await api.put<WidgetDTO>(`/widgets/${widgetId}`, payload);
  return res.data as WidgetDTO;
};

const remove = async (widgetId: string) => {
  await api.delete(`/widgets/${widgetId}`);
};

const toggleActive = async (widgetId: string, isActive: boolean) => {
  const res = await api.patch(`/widgets/${widgetId}/status`, { isActive });
  return res.data;
};

export const WidgetsService = {
  list,
  analytics,
  create,
  update,
  remove,
  toggleActive,
};
