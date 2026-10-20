import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, WeightUnit, ThemeMode } from '../types';
import { authApi, settingsApi, getStoredToken, setStoredToken } from '../api/client';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  weightUnit: WeightUnit;
  theme: ThemeMode;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setWeightUnitPreference: (unit: WeightUnit) => Promise<void>;
  setThemePreference: (theme: ThemeMode) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      applyTheme('dark');
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      applyTheme(me.settings?.theme || 'dark');
    } catch {
      setStoredToken(null);
      setUser(null);
      applyTheme('dark');
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithToken = useCallback(
    (token: string, loggedInUser: User) => {
      setStoredToken(token);
      setUser(loggedInUser);
      applyTheme(loggedInUser.settings?.theme || 'dark');
    },
    [applyTheme]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    applyTheme('dark');
  }, [applyTheme]);

  const setWeightUnitPreference = useCallback(
    async (unit: WeightUnit) => {
      if (!user) return;
      const updated = await settingsApi.updateSettings({ weight_unit: unit });
      setUser((prev) => (prev ? { ...prev, settings: updated } : null));
      showToast(`Weight unit switched to ${unit.toUpperCase()}`, 'info');
    },
    [user, showToast]
  );

  const setThemePreference = useCallback(
    async (mode: ThemeMode) => {
      applyTheme(mode);
      if (!user) return;
      const updated = await settingsApi.updateSettings({ theme: mode });
      setUser((prev) => (prev ? { ...prev, settings: updated } : null));
    },
    [user, applyTheme]
  );

  const weightUnit: WeightUnit = user?.settings?.weight_unit || 'kg';
  const theme: ThemeMode = user?.settings?.theme || 'dark';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        weightUnit,
        theme,
        toasts,
        showToast,
        dismissToast,
        loginWithToken,
        logout,
        refreshUser,
        setWeightUnitPreference,
        setThemePreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
