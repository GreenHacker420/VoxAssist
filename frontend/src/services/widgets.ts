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

const get = async (widgetId: string): Promise<WidgetDTO> => {
  const res = await api.get<WidgetDTO>(`/widgets/${widgetId}`);
  return res.data as WidgetDTO;
};

const remove = async (widgetId: string) => {
  await api.delete(`/widgets/${widgetId}`);
};

const toggleActive = async (widgetId: string, isActive: boolean) => {
  const res = await api.patch(`/widgets/${widgetId}/status`, { isActive });
  return res.data;
};

const generateEmbedCode = (widgetId: string, type: 'script' | 'iframe' | 'react' = 'script', domain?: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  switch (type) {
    case 'script':
      return `<!-- VoxAssist Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widgetId}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

    case 'iframe':
      return `<!-- VoxAssist Widget (iframe) -->
<iframe
  src="${baseUrl}/embed/widget/${widgetId}/iframe?origin=${encodeURIComponent(`https://${domain || 'example.com'}`)}"
  width="350"
  height="500"
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; z-index: 999999; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
</iframe>`;

    case 'react':
      return `// VoxAssist React Component
import { useEffect } from 'react';

export default function VoxAssistWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widgetId}&v=1.0';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(\`script[src*="${widgetId}"]\`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null; // Widget renders itself
}`;

    default:
      return '';
  }
};

export const WidgetsService = {
  list,
  analytics,
  create,
  get,
  update,
  remove,
  toggleActive,
  generateEmbedCode,
};
