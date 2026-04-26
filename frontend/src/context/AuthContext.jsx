import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || '');
  const [loading, setLoading] = useState(false);

  // Load the user profile on mount / when accessToken changes
  useEffect(() => {
    if (!accessToken) return;

    apiFetch('/api/v1/users/me', { auth: true })
      .then((res) => {
        setUser(res?.data || res?.user || res);
      })
      .catch(() => {
        // If even the refresh-retry failed, the client dispatches auth:logout
        // which is handled below — we just clear state here too as a safety net
        setUser(null);
        setAccessToken('');
        localStorage.removeItem('accessToken');
      });
  }, [accessToken]);

  // Listen for forced logout events dispatched by the API client when
  // the refresh token has also expired (true session end)
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      setAccessToken('');
      localStorage.removeItem('accessToken');
    };

    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      const data = res?.data || res;
      const token = data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
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
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: payload,
      });
      const data = res?.data || res;
      const token = data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
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
      await apiFetch('/api/v1/auth/logout', { method: 'GET', auth: true });
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('accessToken');
    setAccessToken('');
    setUser(null);
  };

  const value = {
    user,
    accessToken,
    loading,
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
