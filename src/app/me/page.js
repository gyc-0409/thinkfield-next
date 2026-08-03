'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';

export default function MePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/?login=1');
      return;
    }
    router.replace(`/user/${encodeURIComponent(user)}`);
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex justify-center pt-20">
      <LoadingDots />
    </div>
  );
}
