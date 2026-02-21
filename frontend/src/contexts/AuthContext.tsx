import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const AUTH_TOKEN_KEY = "edualign_token";
const AUTH_USER_KEY = "edualign_user";

interface User {
  id: number;
  username: string;
  email?: string | null;
  created_at?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  ready: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    ready: false,
  });

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        setState({ token, user, ready: true });
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setState({ token: null, user: null, ready: true });
      }
    } else {
      setState((s) => ({ ...s, ready: true }));
    }
  }, []);

  const setAuth = useCallback((token: string, user: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setState({ token, user, ready: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setState({ token: null, user: null, ready: true });
  }, []);

  const login = useCallback((token: string, user: User) => {
    setAuth(token, user);
  }, [setAuth]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    setAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
