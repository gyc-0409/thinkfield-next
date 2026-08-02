'use client';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LoginRequiredModal from '@/components/LoginRequiredModal';
import { useEffect } from 'react';

function AppContent({ children }) {
  const { loginRequiredVisible, hideLoginRequired } = useAuth();
  const router = useRouter();

  // 注册 Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  // 老浏览器检测：不支持 CSS Grid 则提示升级
  useEffect(() => {
    try {
      if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('display', 'grid')) {
        alert('请使用 Chrome/Firefox 等现代浏览器');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleGoLogin = () => {
    hideLoginRequired();
    router.push('/?login=1');
  };

  return (
    <>
      {children}
      {loginRequiredVisible && (
        <LoginRequiredModal onClose={hideLoginRequired} onGoLogin={handleGoLogin} />
      )}
    </>
  );
}

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}