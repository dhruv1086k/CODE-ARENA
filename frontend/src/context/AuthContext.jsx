import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, refreshAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken") || "",
  );
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(
    () => !!localStorage.getItem("accessToken"),
  );

  // Restore session on mount: validate the HttpOnly refresh cookie first so we
  // don't hit /me with a stale access token (which caused a noisy refresh 401).
  useEffect(() => {
    const stored = localStorage.getItem("accessToken");
    if (!stored) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await refreshAccessToken();
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

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for forced logout events dispatched by the API client when
  // the refresh token has also expired (true session end)
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      setAccessToken("");
      localStorage.removeItem("accessToken");
    };

    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  // Listen for silent token refresh events dispatched by the API client.
  // Without this, the React accessToken state stays stale after refresh,
  // causing isAuthenticated → false and wrongly redirecting the user to /login.
  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      const newToken = e.detail?.accessToken;
      if (newToken) {
        setAccessToken(newToken);
      }
    };

    window.addEventListener("auth:tokenRefreshed", handleTokenRefreshed);
    return () =>
      window.removeEventListener("auth:tokenRefreshed", handleTokenRefreshed);
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
      // ignore errors on logout
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
