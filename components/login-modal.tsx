'use client';

import { useState, useEffect } from 'react';
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

  const VALID_USERNAME = 'taghere';
  const VALID_PASSWORD = '0614';

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 w-full max-w-sm mx-4">
        <h1 className="text-2xl font-bold text-center mb-2 text-neutral-900 dark:text-white">
          TagHere Analytics
        </h1>
        <p className="text-center text-neutral-600 dark:text-neutral-400 mb-6">
          로그인이 필요합니다
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              아이디
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              disabled={isLoading}
              className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              비밀번호
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              disabled={isLoading}
              className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-4">
          테스트 계정으로 접속 가능합니다
        </p>
      </div>
    </div>
  );
}
