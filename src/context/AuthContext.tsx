import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, leetcode_id: string) => Promise<void>;
  loginWithGoogle: (payload: {
    id_token?: string;
    access_token?: string;
    leetcode_id?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) => Promise<{
    token?: string;
    user?: User;
    needsLeetCode?: boolean;
    email?: string;
    name?: string;
    avatar?: string;
  }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAuthToken(token);
        const { user } = await api.getProfile();
        setUser(user);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { token, user } = await api.login(email, password);
    await AsyncStorage.setItem('auth_token', token);
    setAuthToken(token);
    setUser(user);
  }

  async function register(username: string, email: string, password: string, leetcode_id: string) {
    const { token, user } = await api.register(username, email, password, leetcode_id);
    await AsyncStorage.setItem('auth_token', token);
    setAuthToken(token);
    setUser(user);
  }

  async function loginWithGoogle(payload: {
    id_token?: string;
    access_token?: string;
    leetcode_id?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) {
    const res = await api.googleAuth(payload);
    if (res.token && res.user) {
      await AsyncStorage.setItem('auth_token', res.token);
      setAuthToken(res.token);
      setUser(res.user);
    }
    return res;
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    setAuthToken(null);
    setUser(null);
  }

  async function refreshProfile() {
    try {
      const { user } = await api.getProfile();
      setUser(user);
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
