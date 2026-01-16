'use client';

import { useState } from 'react';
import { LoginModal } from '@/components/login-modal';
import { useAuth } from '@/components/auth/AuthContext';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { session, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogin = () => {
    setShowLoginModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {!session && <LoginModal onLogin={handleLogin} />}
      {session && children}
    </>
  );
}
