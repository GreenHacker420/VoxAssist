import { DashboardAnalytics } from '@/types';

export const DEMO_ANALYTICS: DashboardAnalytics = {
  overview: {
    totalCalls: 1247,
    resolvedCalls: 1089,
    escalatedCalls: 158,
    avgCallDuration: 342,
    resolutionRate: 0.87
  },
  callVolume: {
    today: 45,
    yesterday: 38,
    thisWeek: 287,
    lastWeek: 251
  },
  hourlyDistribution: [
    { hour: 9, calls: 12 },
    { hour: 10, calls: 18 },
    { hour: 11, calls: 25 },
    { hour: 12, calls: 22 },
    { hour: 13, calls: 15 },
    { hour: 14, calls: 28 },
    { hour: 15, calls: 31 },
    { hour: 16, calls: 24 },
    { hour: 17, calls: 19 }
  ],
  sentimentTrends: [
    { date: '2024-01-15', positive: 65, neutral: 25, negative: 10 },
    { date: '2024-01-16', positive: 70, neutral: 22, negative: 8 },
    { date: '2024-01-17', positive: 68, neutral: 24, negative: 8 },
    { date: '2024-01-18', positive: 72, neutral: 20, negative: 8 },
    { date: '2024-01-19', positive: 75, neutral: 18, negative: 7 }
  ]
};

export const DEMO_PERFORMANCE_METRICS = {
  responseTime: {
    average: 1.2,
    p95: 2.1,
    p99: 3.5
  },
  accuracy: {
    transcription: 0.94,
    intentRecognition: 0.91,
    sentimentAnalysis: 0.88
  },
  customerSatisfaction: {
    overall: 4.3,
    ratings: [
      { score: 5, count: 156 },
      { score: 4, count: 89 },
      { score: 3, count: 23 },
      { score: 2, count: 8 },
      { score: 1, count: 4 }
    ]
  }
};

export const DEMO_WIDGET_STATS = {
  totalWidgets: 12,
  activeWidgets: 8,
  totalInteractions: 2847,
  conversionRate: 0.23,
  averageSessionDuration: 245
};
