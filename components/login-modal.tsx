'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginModalProps {
  onLogin: () => void;
}

export function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const VALID_USERNAME = 'taghere';
  const VALID_PASSWORD = '0614';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate delay for security feel
    await new Promise(resolve => setTimeout(resolve, 500));

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem('taghere_auth', 'true');
      localStorage.setItem('taghere_timestamp', Date.now().toString());
      onLogin();
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username && password && !isLoading) {
      handleSubmit(e as any);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4 border border-neutral-800 transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/taghere-logo.png"
              alt="TagHere Logo"
              width={120}
              height={120}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">
            TagHere Analytics
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            서비스에 접속하려면 로그인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              아이디
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="아이디를 입력하세요"
              disabled={isLoading}
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              비밀번호
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="••••••"
              disabled={isLoading}
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 text-red-400 rounded-lg text-sm animate-shake">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                로그인 중...
              </div>
            ) : (
              '로그인'
            )}
          </Button>
        </form>

      </div>
    </div>
  );
}
