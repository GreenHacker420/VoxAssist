import api from '@/lib/api';

export interface WebsiteAnalysisResult {
  url: string;
  title: string;
  description: string;
  favicon: string;
  colors: string[];
  fonts: string[];
  language: string;
  viewport: string;
  socialMedia: {
    ogImage?: string;
    twitterCard?: string;
    twitterSite?: string;
  };
  branding: {
    logo?: string;
    brandName?: string;
  };
  theme: 'light' | 'dark' | 'auto';
  accessibility: {
    score: number;
    issues: string[];
  };
  performance?: {
    contentLength: number;
    responseTime: number;
    compression: string;
  };
  suggestions: WebsiteSuggestion[];
}

export interface WebsiteSuggestion {
  type: 'color' | 'theme' | 'position' | 'font' | 'accessibility';
  title: string;
  description: string;
  action: string;
  value: any;
}

export interface WebsiteAnalysisResponse {
  success: boolean;
  data?: WebsiteAnalysisResult;
  error?: string;
  url: string;
  analyzedAt: string;
  cached?: boolean;
}

export interface URLValidationResponse {
  success: boolean;
  valid: boolean;
  url: string;
  message: string;
  error?: string | number;
}

class WebsiteAnalysisService {
  /**
   * Analyze a website for widget integration
   */
  async analyzeWebsite(url: string, options?: {
    timeout?: number;
    includePerformance?: boolean;
  }): Promise<WebsiteAnalysisResponse> {
    try {
      const response = await api.post('/website-analysis/analyze', {
        url,
        options: {
          timeout: options?.timeout || 10000,
          includePerformance: options?.includePerformance || false,
        }
      });

      console.log('Website analysis API response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));

      // Handle different response formats

      // Case 1: Direct backend response (has success, data, url, analyzedAt)
      if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
        console.log('Using direct backend response format');
        return response as WebsiteAnalysisResponse;
      }

      // Case 2: API client wrapped response (has success and data properties)
      if (response && typeof response === 'object' && response.success && response.data) {
        console.log('Using API client wrapped format');
        return response.data as WebsiteAnalysisResponse;
      }

      // Case 3: Simple data response
      if (response && typeof response === 'object' && response.data) {
        console.log('Using simple data format');
        return response.data as WebsiteAnalysisResponse;
      }

      // Fallback - log the actual response for debugging
      console.error('Unexpected response format:', response);
      throw new Error(`No data received from website analysis. Response: ${JSON.stringify(response)}`);
    } catch (error: any) {
      console.error('Website analysis failed:', error);

      // Handle different error types
      if (error.response?.data) {
        return error.response.data;
      }

      // Handle rate limit and other specific errors
      if (error.error) {
        return {
          success: false,
          error: error.error,
          url,
          analyzedAt: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to analyze website',
        url,
        analyzedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Validate if a URL is accessible for analysis
   */
  async validateURL(url: string): Promise<URLValidationResponse> {
    try {
      const response = await api.get('/website-analysis/validate-url', {
        params: { url }
      });

      console.log('URL validation API response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));

      // Handle different response formats

      // Case 1: Direct backend response (has success, valid, url, message)
      if (response && typeof response === 'object' && 'success' in response && 'valid' in response) {
        console.log('Using direct backend response format');
        return response as URLValidationResponse;
      }

      // Case 2: API client wrapped response
      if (response && typeof response === 'object' && response.success && response.data) {
        console.log('Using API client wrapped format');
        return response.data as URLValidationResponse;
      }

      // Case 3: Simple data response
      if (response && typeof response === 'object' && response.data) {
        console.log('Using simple data format');
        return response.data as URLValidationResponse;
      }

      // Fallback - log the actual response for debugging
      console.error('Unexpected URL validation response format:', response);
      throw new Error(`No data received from URL validation. Response: ${JSON.stringify(response)}`);
    } catch (error: any) {
      console.error('URL validation failed:', error);

      // Handle specific error messages
      let errorMessage = 'Failed to validate URL';
      if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        valid: false,
        url,
        message: errorMessage,
        error: errorMessage
      };
    }
  }

  /**
   * Get cached suggestions for a domain
   */
  async getSuggestions(domain: string): Promise<{
    success: boolean;
    domain: string;
    suggestions: WebsiteSuggestion[];
    cached: boolean;
    message?: string;
  }> {
    try {
      const response = await api.get(`/website-analysis/suggestions/${domain}`);
      // The backend returns the response directly with success: true/false
      // The API client wraps it in ApiResponse format, so we need to check both formats

      // If the response has success property, it's the direct backend response
      if (response.success !== undefined) {
        return response as unknown as {
          success: boolean;
          domain: string;
          suggestions: WebsiteSuggestion[];
          cached: boolean;
          message?: string;
        };
      }

      // If the response has data property, it's wrapped by API client
      if (response.data) {
        return response.data as {
          success: boolean;
          domain: string;
          suggestions: WebsiteSuggestion[];
          cached: boolean;
          message?: string;
        };
      }

      throw new Error('No data received from suggestions');
    } catch (error: any) {
      console.error('Failed to get suggestions:', error);
      
      return {
        success: false,
        domain,
        suggestions: [],
        cached: false,
        message: 'Failed to retrieve suggestions'
      };
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * Apply website analysis suggestions to widget configuration
   */
  applySuggestions(
    suggestions: WebsiteSuggestion[],
    currentConfig: any
  ): any {
    let updatedConfig = { ...currentConfig };

    suggestions.forEach(suggestion => {
      switch (suggestion.action) {
        case 'apply_primary_color':
          if (updatedConfig.appearance) {
            updatedConfig.appearance.primaryColor = suggestion.value;
          }
          break;
          
        case 'apply_theme':
          if (updatedConfig.appearance) {
            updatedConfig.appearance.theme = suggestion.value;
          }
          break;
          
        case 'apply_position':
          if (updatedConfig.appearance) {
            updatedConfig.appearance.position = suggestion.value;
          }
          break;
          
        case 'apply_font':
          if (updatedConfig.appearance) {
            updatedConfig.appearance.fontFamily = suggestion.value;
          }
          break;
          
        default:
          console.log(`Unknown suggestion action: ${suggestion.action}`);
      }
    });

    return updatedConfig;
  }

  /**
   * Generate widget configuration from analysis result
   */
  generateWidgetConfig(analysis: WebsiteAnalysisResult): {
    appearance: any;
    behavior: any;
    suggestions: WebsiteSuggestion[];
  } {
    const primaryColor = analysis.colors[0] || '#3B82F6';
    const secondaryColor = analysis.colors[1] || '#10B981';
    
    return {
      appearance: {
        position: 'bottom-right',
        primaryColor,
        secondaryColor,
        textColor: analysis.theme === 'dark' ? '#FFFFFF' : '#1F2937',
        backgroundColor: analysis.theme === 'dark' ? '#1F2937' : '#FFFFFF',
        borderRadius: '12px',
        size: 'medium',
        theme: analysis.theme,
      },
      behavior: {
        autoOpen: false,
        autoOpenDelay: 3000,
        greeting: `Hi! Welcome to ${analysis.branding.brandName || 'our website'}. How can I help you today?`,
        language: analysis.language || 'en',
        enableVoice: true,
        enableText: true,
        enableFileUpload: false,
        showBranding: true,
      },
      suggestions: analysis.suggestions
    };
  }

  /**
   * Check if URL is valid for analysis
   */
  isValidURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get color palette from analysis
   */
  getColorPalette(analysis: WebsiteAnalysisResult): {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  } {
    const colors = analysis.colors;
    
    return {
      primary: colors[0] || '#3B82F6',
      secondary: colors[1] || '#10B981',
      accent: colors[2] || '#F59E0B',
      text: analysis.theme === 'dark' ? '#FFFFFF' : '#1F2937',
      background: analysis.theme === 'dark' ? '#1F2937' : '#FFFFFF',
    };
  }
}

export default new WebsiteAnalysisService();
