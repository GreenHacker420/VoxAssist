'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { AuthService } from '@/services/auth';
import { DEMO_USER, enableDemoMode as enableDemo, disableDemoMode as disableDemo } from '@/demo';
import { message } from 'antd';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'email'>>) => Promise<void>;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if demo mode is enabled from localStorage
        const demoMode = localStorage.getItem('voxassist_demo_mode') === 'true';
        if (demoMode) {
          setIsDemoMode(true);
          setUser(DEMO_USER);
        } else if (AuthService.isAuthenticated()) {
          const userData = await AuthService.getProfile();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
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
      message.success('Login successful!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      message.error(errorMessage);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await AuthService.register({ name, email, password });
      setUser(response.data.user);
      message.success('Registration successful!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      message.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (isDemoMode) {
        disableDemo();
        setIsDemoMode(false);
        setUser(null);
        message.success('Demo session ended');
      } else {
        await AuthService.logout();
        setUser(null);
        message.success('Logged out successfully');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      message.error(errorMessage);
    }
  };

  const updateProfile = async (data: Partial<Pick<User, 'name' | 'email'>>) => {
    try {
      if (isDemoMode) {
        // In demo mode, just update the local user state
        setUser(prev => prev ? { ...prev, ...data } : null);
        message.success('Profile updated (demo mode)');
        return;
      }
      const updatedUser = await AuthService.updateProfile(data);
      setUser(updatedUser);
      message.success('Profile updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      message.error(errorMessage);
      throw error;
    }
  };

  const enableDemoMode = () => {
    enableDemo();
    setIsDemoMode(true);
    setUser(DEMO_USER);
    message.success('Demo mode enabled!');
  };

  const disableDemoMode = () => {
    disableDemo();
    setIsDemoMode(false);
    setUser(null);
    message.success('Demo mode disabled');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isDemoMode,
    login,
    register,
    logout,
    updateProfile,
    enableDemoMode,
    disableDemoMode,
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
