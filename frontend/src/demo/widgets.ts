export interface DemoWidget {
  id: string;
  name: string;
  description: string;
  contextUrl?: string;
  status: 'active' | 'inactive';
  isActive: boolean;
  createdAt: string;
  lastUsed: string;
  totalInteractions: number;
  conversionRate: number;
  averageSessionDuration: number;
  configuration: {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    greeting: string;
    language: string;
  };
}

export const DEMO_WIDGETS: DemoWidget[] = [
  {
    id: 'widget-1',
    name: 'Main Website Widget',
    description: 'Primary voice chat widget for homepage',
    contextUrl: 'https://example.com',
    status: 'active',
    isActive: true,
    createdAt: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    lastUsed: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    totalInteractions: 1247,
    conversionRate: 0.23,
    averageSessionDuration: 245,
    configuration: {
      position: 'bottom-right',
      theme: 'light',
      primaryColor: '#3B82F6',
      greeting: 'Hi! How can I help you today?',
      language: 'en'
    }
  },
  {
    id: 'widget-2',
    name: 'Support Page Widget',
    description: 'Specialized widget for customer support page',
    contextUrl: 'https://example.com/support',
    status: 'active',
    isActive: true,
    createdAt: new Date(Date.now() - 1728000000).toISOString(), // 20 days ago
    lastUsed: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    totalInteractions: 892,
    conversionRate: 0.31,
    averageSessionDuration: 312,
    configuration: {
      position: 'bottom-left',
      theme: 'dark',
      primaryColor: '#10B981',
      greeting: 'Need help? I\'m here to assist you!',
      language: 'en'
    }
  },
  {
    id: 'widget-3',
    name: 'Product Demo Widget',
    description: 'Widget for product demonstration pages',
    contextUrl: 'https://example.com/demo',
    status: 'inactive',
    isActive: false,
    createdAt: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
    lastUsed: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    totalInteractions: 456,
    conversionRate: 0.18,
    averageSessionDuration: 189,
    configuration: {
      position: 'top-right',
      theme: 'auto',
      primaryColor: '#8B5CF6',
      greeting: 'Want to learn more about our product?',
      language: 'en'
    }
  },
  {
    id: 'widget-4',
    name: 'Checkout Widget',
    description: 'Assistance widget for checkout process',
    contextUrl: 'https://example.com/checkout',
    status: 'active',
    isActive: true,
    createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    lastUsed: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    totalInteractions: 234,
    conversionRate: 0.42,
    averageSessionDuration: 156,
    configuration: {
      position: 'bottom-right',
      theme: 'light',
      primaryColor: '#F59E0B',
      greeting: 'Need help completing your purchase?',
      language: 'en'
    }
  }
];

export const DEMO_WIDGET_ANALYTICS = {
  totalWidgets: 4,
  activeWidgets: 3,
  totalInteractions: 2829,
  averageConversionRate: 0.285,
  averageSessionDuration: 225.5,
  topPerformingWidget: 'widget-4',
  recentActivity: [
    {
      widgetId: 'widget-1',
      event: 'interaction_started',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      duration: 245
    },
    {
      widgetId: 'widget-2',
      event: 'conversion_completed',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      duration: 312
    },
    {
      widgetId: 'widget-4',
      event: 'interaction_started',
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      duration: 156
    }
  ]
};
