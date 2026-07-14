import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AxiosError } from "axios";
import i18n from "../i18n.ts";
import { setToken, register, login, getMe } from "../api.ts";
import type { User } from "../types.ts";

const errorMessages: Record<string, string> = {
  "Username taken": "auth.error.username_taken",
  "Invalid credentials": "auth.error.invalid_credentials",
  "Username and password required": "auth.error.fields_required",
};

function translateError(msg: string): string {
  const key = errorMessages[msg];
  return key ? i18n.t(key) : msg;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleRegister: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  logout: () => void;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    setToken(token);
    getMe().then((u) => {
      setUser(u);
    }).catch(() => {
      localStorage.removeItem("token");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const data = await login(fd.get("username") as string, fd.get("password") as string);
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setAuthError(translateError(axiosErr.response?.data?.error || "Login failed"));
    }
  }, []);

  const handleRegister = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const data = await register(fd.get("username") as string, fd.get("password") as string, (fd.get("name") as string) || undefined);
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setAuthError(translateError(axiosErr.response?.data?.error || "Registration failed"));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, handleLogin, handleRegister, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
