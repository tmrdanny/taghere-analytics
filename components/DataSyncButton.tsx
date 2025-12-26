'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, RefreshCw, Database, Cloud, HardDrive } from 'lucide-react';

const syncSteps = [
  { id: 'auth', label: '인증 확인 중...', icon: RefreshCw },
  { id: 'connect', label: 'MongoDB 연결 중...', icon: Cloud },
  { id: 'fetch', label: '최신 데이터 조회 중...', icon: Database },
  { id: 'cache', label: 'SQLite 캐시 업데이트 중...', icon: HardDrive },
  { id: 'done', label: '완료!', icon: CheckCircle },
];

export function DataSyncButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Reset progress when loading starts/stops
  useEffect(() => {
    if (isLoading) {
      setCurrentStep(0);
      setProgress(0);

      // Simulate step progression
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < syncSteps.length - 2) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);

      // Smooth progress bar
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 85) {
            return prev + Math.random() * 8;
          }
          return prev;
        });
      }, 300);

      return () => {
        clearInterval(stepInterval);
        clearInterval(progressInterval);
      };
    } else if (result) {
      // Complete the progress when done
      setCurrentStep(syncSteps.length - 1);
      setProgress(100);
    }
  }, [isLoading, result]);

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

      // 5초 후 자동으로 다이얼로그 닫기
      setTimeout(() => {
        setIsOpen(false);
        setResult(null);
      }, 5000);
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
      setCurrentStep(0);
      setProgress(0);
    }
    setIsOpen(open);
  };

  const CurrentIcon = syncSteps[currentStep]?.icon || RefreshCw;

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

          {isLoading ? (
            <div className="space-y-6 py-4">
              {/* Animated Icon */}
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CurrentIcon className="w-6 h-6 text-primary animate-pulse" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(progress)}%</span>
                  <span>{syncSteps[currentStep]?.label}</span>
                </div>
              </div>

              {/* Data Source Info */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Cloud className="w-4 h-4" />
                <span>MongoDB</span>
                <span className="text-muted">→</span>
                <HardDrive className="w-4 h-4" />
                <span>SQLite Cache</span>
              </div>

              {/* Steps Indicator */}
              <div className="flex justify-center gap-2">
                {syncSteps.slice(0, -1).map((step, idx) => (
                  <div
                    key={step.id}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      idx <= currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">동기화 완료!</span>
              </div>

              {/* Completion Progress */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full w-full" />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">동기화 결과</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {result.syncedDates && result.syncedDates.length > 0 ? (
                    <div>
                      <span className="text-muted-foreground">동기화된 날짜:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {result.syncedDates.map((date: string) => (
                          <span key={date} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                            {date}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      캐시가 최신 상태입니다. 동기화할 데이터가 없습니다.
                    </div>
                  )}
                  {result.stats && (
                    <>
                      <div>
                        <span className="text-muted-foreground">일일 스토어 레코드:</span>
                        <span className="ml-2 font-medium">{result.stats.dailyStoreRecords?.toLocaleString() || 0}개</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">메뉴 레코드:</span>
                        <span className="ml-2 font-medium">{result.stats.dailyMenuRecords?.toLocaleString() || 0}개</span>
                      </div>
                    </>
                  )}
                  {result.message && (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {result.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                5초 후 자동으로 닫힙니다...
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
                  동기화
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
