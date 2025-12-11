'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PageTransition } from './PageTransition';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isHeaderElevated, setIsHeaderElevated] = useState(false);

  const navItems = useMemo(
    () => [
      { href: '/home', label: 'ホーム', icon: '🏠' },
      { href: '/schedule', label: 'スケジュール', icon: '📅' },
      { href: '/rating', label: '決算書', icon: '📊' },
      { href: '/trial_balance', label: '試算表', icon: '📑' },
      { href: '/settings/company', label: '設定', icon: '⚙️' },
    ],
    []
  );

  const activeIndex = navItems.findIndex((item) => pathname?.startsWith(item.href));

  useEffect(() => {
    const onScroll = () => setIsHeaderElevated(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname === '/' || pathname === '/login') {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
      {/* Header */}
      <header
        className={cn(
          'safe-area-pt sticky top-0 z-20 flex h-16 items-center justify-between px-4 transition-[height,box-shadow,backdrop-filter] duration-200',
          'backdrop-blur-md bg-white/90 border-b border-slate-200',
          isHeaderElevated ? 'h-14 shadow-md' : 'h-16 shadow-sm'
        )}
        role="banner"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary-plum-700)] to-[var(--color-primary-salmon-700)] text-white shadow-[0_8px_24px_rgba(144,104,144,0.25)]">
            CZ
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-500">Tax & Labour Portal</p>
            <p className="text-lg font-bold text-slate-900">CLAS-Z</p>
          </div>
        </div>
        <div aria-hidden className="hidden text-xs font-medium text-slate-500 sm:block">モバイル優先 UI</div>
      </header>

      {/* Main Content with page transition */}
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:pb-20">
        <div className="w-full">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around gap-1 border-t border-slate-200 bg-white/90 px-3 pt-2 shadow-[0_-8px_32px_rgba(17,24,39,0.08)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        aria-label="主要ナビゲーション"
      >
        <span
          className={cn('nav-indicator', activeIndex === -1 && 'is-hidden')}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
          aria-hidden
        />
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative z-10 flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[11px] font-semibold transition-transform duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary-plum-700)]',
                isActive ? 'text-white drop-shadow-sm' : 'text-slate-600'
              )}
              style={{
                transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <span aria-hidden className="text-xl">
                {item.icon}
              </span>
              <span>{item.label}</span>
              <span className="sr-only">{isActive ? '現在のタブ' : 'タブを開く'}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
