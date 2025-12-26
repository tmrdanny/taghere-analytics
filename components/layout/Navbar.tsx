'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Search, Home, LogOut } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  {
    href: '/',
    label: '대시보드',
    icon: Home,
  },
  {
    href: '/explore',
    label: '탐색',
    icon: Search,
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem('taghere_auth');
    localStorage.removeItem('taghere_timestamp');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-7xl items-center mx-auto px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <Image
            src="/taghere-logo.png"
            alt="TagHere"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="font-semibold text-lg hidden sm:inline-block">
            TagHere Analytics
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                asChild
                className={cn(
                  'gap-2',
                  isActive && 'bg-secondary'
                )}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden md:inline-block">
            B2B Store Analytics
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline-block text-xs">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
