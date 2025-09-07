import apiClient from '@/lib/api';
import { AuthResponse, LoginCredentials, RegisterData, User } from '@/types';

export class AuthService {
  // Login user
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse['data']>('/auth/login', credentials);
    
    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.token);
      return {
        success: true,
        data: response.data,
      };
    }
    
    throw new Error(response.error || 'Login failed');
  }

  // Register new user
  static async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse['data']>('/auth/register', userData);
    
    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.token);
      return {
        success: true,
        data: response.data,
      };
    }
    
    throw new Error(response.error || 'Registration failed');
  }

  // Get current user profile
  static async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/auth/profile');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get profile');
  }

  // Update user profile
  static async updateProfile(data: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    const response = await apiClient.put<User>('/auth/profile', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update profile');
  }

  // Change password
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to change password');
    }
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      apiClient.removeAuthToken();
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!apiClient.getAuthToken();
  }

  // Get stored token
  static getToken(): string | undefined {
    return apiClient.getAuthToken();
  }
}
