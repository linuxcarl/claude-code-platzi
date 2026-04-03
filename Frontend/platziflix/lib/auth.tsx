"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi, users as usersApi, setToken, clearToken, ApiError } from "./api";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await usersApi.me();
      setUser(me);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const onLogout = () => { setUser(null); clearToken(); };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setToken(data.access_token);
    await refreshUser();
  };

  const register = async (email: string, password: string, full_name: string) => {
    const data = await authApi.register({ email, password, full_name });
    setToken(data.access_token);
    await refreshUser();
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
