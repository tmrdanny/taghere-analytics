'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export function DataSyncButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!password) {
      setError('비밀번호를 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '동기화 실패');
        setPassword('');
        return;
      }

      setResult(data.result);
      setPassword('');
      
      // 3초 후 자동으로 다이얼로그 닫기
      setTimeout(() => {
        setIsOpen(false);
        setResult(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword('');
      setError(null);
      setResult(null);
    }
    setIsOpen(open);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        최신 데이터 가져오기
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>최신 데이터 동기화</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">동기화 완료!</span>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">동기화 결과</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">일일 메트릭:</span>
                    <span className="ml-2 font-medium">{result.metricsProcessed?.daily || 0}개</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">메뉴 메트릭:</span>
                    <span className="ml-2 font-medium">{result.metricsProcessed?.menu || 0}개</span>
                  </div>
                  {result.message && (
                    <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded text-xs">
                      {result.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                3초 후 자동으로 닫힙니다...
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">오류</span>
              </div>
              <p className="text-sm text-red-600">{error}</p>
              <Button
                onClick={() => setError(null)}
                className="w-full"
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                비밀번호를 입력하여 최신 데이터를 동기화합니다.
              </p>

              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleSync();
                  }
                }}
                disabled={isLoading}
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={isLoading || !password}
                  className="flex-1"
                >
                  {isLoading ? '동기화 중...' : '동기화'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
