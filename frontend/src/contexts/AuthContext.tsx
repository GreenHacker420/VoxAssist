'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { AuthService } from '@/services/auth';
import { App } from 'antd';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'email'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { message } = App.useApp();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          // Try to restore user data from localStorage first
          const cachedUserData = localStorage.getItem('voxassist_user_data');
          if (cachedUserData) {
            try {
              const userData = JSON.parse(cachedUserData);
              setUser(userData);

              // Verify the cached data is still valid by making a background request
              AuthService.getProfile()
                .then(freshUserData => {
                  setUser(freshUserData);
                  localStorage.setItem('voxassist_user_data', JSON.stringify(freshUserData));
                })
                .catch(error => {
                  console.warn('Failed to refresh user data:', error);
                  // Keep using cached data if refresh fails
                });
            } catch (parseError) {
              console.warn('Failed to parse cached user data:', parseError);
              // Fall back to fresh API call
              const userData = await AuthService.getProfile();
              setUser(userData);
              localStorage.setItem('voxassist_user_data', JSON.stringify(userData));
            }
          } else {
            // No cached data, make fresh API call
            const userData = await AuthService.getProfile();
            setUser(userData);
            localStorage.setItem('voxassist_user_data', JSON.stringify(userData));
          }
        }
      } catch (error) {
        // Enhanced error logging with detailed information
        const errorDetails = {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'UnknownError',
          cause: error instanceof Error ? error.cause : undefined,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'
        };

        console.error('Failed to initialize auth:', errorDetails);
        console.error('Original error object:', error);

        // Clear any potentially corrupted auth state
        AuthService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password });
      setUser(response.data.user);

      // Cache user data for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('voxassist_user_data', JSON.stringify(response.data.user));
      }

      message.success('Login successful!');
    } catch (error: unknown) {
      // Enhanced error logging for login failures
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Login failed',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'LoginError',
        timestamp: new Date().toISOString(),
        email: email, // Log email for debugging (remove in production)
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'
      };

      console.error('Login failed:', errorDetails);
      console.error('Original login error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      message.error(errorMessage);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await AuthService.register({ name, email, password });
      setUser(response.data.user);

      // Cache user data for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('voxassist_user_data', JSON.stringify(response.data.user));
      }

      message.success('Registration successful!');
    } catch (error: unknown) {
      // Enhanced error logging for registration failures
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Registration failed',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'RegistrationError',
        timestamp: new Date().toISOString(),
        email: email, // Log email for debugging (remove in production)
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'
      };

      console.error('Registration failed:', errorDetails);
      console.error('Original registration error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      message.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      message.success('Logged out successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      message.error(errorMessage);
    }
  };

  const updateProfile = async (data: Partial<Pick<User, 'name' | 'email'>>) => {
    try {
      const updatedUser = await AuthService.updateProfile(data);
      setUser(updatedUser);
      message.success('Profile updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      message.error(errorMessage);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
