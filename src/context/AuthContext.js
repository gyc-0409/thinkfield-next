'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginRequiredVisible, setLoginRequiredVisible] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data.username);
        setRole(data.role);
      } else {
        setUser(null);
        setRole(null);
      }
    } catch (e) {
      setUser(null);
      setRole(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username, password, email, university, code, isRegister = false) => {
    const url = isRegister ? '/api/register' : '/api/login';
    const body = isRegister
      ? { username, password, email, university, code }
      : { username, password };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    await refreshUser();
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setRole(null);
  };

  const showLoginRequired = useCallback(() => {
    setLoginRequiredVisible(true);
  }, []);

  const hideLoginRequired = useCallback(() => {
    setLoginRequiredVisible(false);
  }, []);

  const requireLogin = useCallback(() => {
    if (user) return true;
    showLoginRequired();
    return false;
  }, [user, showLoginRequired]);

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      login,
      logout,
      refreshUser,
      showLoginRequired,
      hideLoginRequired,
      requireLogin,
      loginRequiredVisible,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}