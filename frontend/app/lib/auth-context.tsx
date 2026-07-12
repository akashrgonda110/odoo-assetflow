"use client";

/**
 * AssetFlow – Auth Context
 * Provides current user, login/logout, and role helpers throughout the app.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  auth,
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  storeUser,
} from "./api";
import type { AuthUser, LoginPayload, RegisterPayload, Role } from "./types";

// ─── Shape ────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  isRole: (...roles: Role[]) => boolean;
  canManage: boolean;   // admin | asset_manager
  isAdmin: boolean;
}

// ─── Context ──────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = getStoredUser();
    const token  = getToken();
    if (stored && token) {
      setUser(stored);
      // Optionally re-validate against /auth/me (silently)
      auth
        .me()
        .then((res) => {
          setUser(res.data);
          storeUser(res.data);
        })
        .catch(() => {
          // Token expired – clear session
          clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await auth.login(payload);
    setToken(res.data.accessToken);
    storeUser(res.data.user);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await auth.register(payload);
    setToken(res.data.accessToken);
    storeUser(res.data.user);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
  }, []);

  const isRole = useCallback(
    (...roles: Role[]) => !!user && roles.includes(user.role),
    [user]
  );

  const canManage = !!user && (user.role === "admin" || user.role === "asset_manager");
  const isAdmin   = !!user && user.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isRole, canManage, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
