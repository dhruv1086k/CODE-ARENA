import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, ensureValidAccessToken, isAccessTokenExpired } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken") || "",
  );
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = localStorage.getItem("accessToken");

      try {
        if (stored && !isAccessTokenExpired(stored)) {
          const res = await apiFetch("/api/v1/users/me", { auth: true });
          if (cancelled) return;
          setUser(res?.data || res?.user || res);
          setAccessToken(stored);
          return;
        }

        const token = await ensureValidAccessToken();
        const res = await apiFetch("/api/v1/users/me", { auth: true });
        if (cancelled) return;
        if (token) setAccessToken(token);
        setUser(res?.data || res?.user || res);
      } catch {
        if (cancelled) return;
        setUser(null);
        setAccessToken("");
        localStorage.removeItem("accessToken");
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      setAccessToken("");
      localStorage.removeItem("accessToken");
    };

    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      const newToken = e.detail?.accessToken;
      if (newToken) setAccessToken(newToken);
    };

    window.addEventListener("auth:tokenRefreshed", handleTokenRefreshed);
    return () => window.removeEventListener("auth:tokenRefreshed", handleTokenRefreshed);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const data = res?.data || res;
      const token = data?.accessToken;
      if (token) {
        localStorage.setItem("accessToken", token);
        setAccessToken(token);
      }
      setUser(data?.user || null);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: payload,
      });
      const data = res?.data || res;
      const token = data?.accessToken;
      if (token) {
        localStorage.setItem("accessToken", token);
        setAccessToken(token);
      }
      setUser(data?.user || null);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "GET", auth: true });
    } catch {
      /* best effort */
    }
    localStorage.removeItem("accessToken");
    setAccessToken("");
    setUser(null);
  };

  const value = {
    user,
    accessToken,
    loading,
    initializing,
    login,
    register,
    logout,
    isAuthenticated: !!accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
