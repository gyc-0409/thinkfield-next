'use client';
import 'core-js/stable';
import './globals.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LoginRequiredModal from '@/components/LoginRequiredModal';

function AppContent({ children }) {
  const { loginRequiredVisible, hideLoginRequired } = useAuth();
  const router = useRouter();

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

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <AppContent>{children}</AppContent>
        </AuthProvider>
      </body>
    </html>
  );
}