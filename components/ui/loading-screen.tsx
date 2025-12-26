'use client';

import { useState, useEffect } from 'react';
import { Database, Cloud, HardDrive, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

const loadingSteps = [
  { id: 'init', label: '초기화 중...', icon: Loader2 },
  { id: 'cache', label: 'SQLite 캐시 확인 중...', icon: HardDrive },
  { id: 'fetch', label: '데이터 조회 중...', icon: Database },
  { id: 'render', label: '대시보드 준비 중...', icon: Cloud },
];

export function LoadingScreen({ message }: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.random() * 10;
        }
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentIcon = loadingSteps[currentStep]?.icon || Loader2;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
          <div
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <CurrentIcon className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Current Step */}
        <p className="text-lg font-medium text-foreground mb-2">
          {loadingSteps[currentStep]?.label || 'Loading...'}
        </p>

        {/* Data Source Info */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          <span>SQLite Cache</span>
          <span className="text-muted">→</span>
          <span>Dashboard</span>
        </div>

        {/* Additional Message */}
        {message && (
          <p className="mt-4 text-xs text-muted-foreground">
            {message}
          </p>
        )}

        {/* Steps Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {loadingSteps.map((step, idx) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Alternative simple loading for smaller components
export function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
