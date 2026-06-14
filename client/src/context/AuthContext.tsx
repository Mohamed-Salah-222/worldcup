import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiPost } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/auth";

export type Stage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "FINAL";

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  totalPoints: number;
  doublersUsed: Record<Stage, boolean>;
};

type AuthResponse = {
  token: string;
  user: User;
};

type MeResponse = {
  user: User;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    displayName: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<MeResponse>("/api/auth/me");
      setUser(data.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiPost<AuthResponse>("/api/auth/login", {
      username,
      password,
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (username: string, displayName: string, password: string) => {
      const data = await apiPost<AuthResponse>("/api/auth/register", {
        username,
        displayName,
        password,
      });
      setToken(data.token);
      setUser(data.user);
    },
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
