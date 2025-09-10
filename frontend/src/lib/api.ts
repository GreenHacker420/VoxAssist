import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://voxassist.onrender.com'
        : 'http://localhost:3001');
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          Cookies.remove('auth-token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request(config);

      // Check if response is already in ApiResponse format
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }

      // If not, wrap the data in ApiResponse format
      return {
        success: true,
        data: response.data as T
      };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
      throw {
        success: false,
        error: axiosError.response?.data?.error || axiosError.message || 'An error occurred',
      };
    }
  }

  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Set auth token with improved persistence
  setAuthToken(token: string): void {
    // Store in both cookies and localStorage for better persistence
    Cookies.set('auth-token', token, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Also store in localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('voxassist_auth_token', token);
      localStorage.setItem('voxassist_auth_timestamp', Date.now().toString());
    }
  }

  // Remove auth token from all storage locations
  removeAuthToken(): void {
    Cookies.remove('auth-token');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('voxassist_auth_token');
      localStorage.removeItem('voxassist_auth_timestamp');
      localStorage.removeItem('voxassist_user_data');
    }
  }

  // Get auth token with fallback to localStorage
  getAuthToken(): string | undefined {
    // First try cookies
    let token = Cookies.get('auth-token');

    // If not found in cookies, try localStorage
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('voxassist_auth_token');
      const timestamp = localStorage.getItem('voxassist_auth_timestamp');

      // Check if token is not expired (7 days)
      if (storedToken && timestamp) {
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

        if (tokenAge < maxAge) {
          token = storedToken;
          // Restore to cookies
          this.setAuthToken(token);
        } else {
          // Token expired, clean up
          this.removeAuthToken();
        }
      }
    }

    return token;
  }
}

// Create singleton instance
const apiClient = new ApiClient();
export default apiClient;
