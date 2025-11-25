'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PageTransition } from './PageTransition';

const NAV_ITEMS = [
  { href: '/home', label: 'ホーム', icon: '🏠' },
  { href: '/schedule', label: 'スケジュール', icon: '📅' },
  { href: '/rating', label: '決算書', icon: '📊' },
  { href: '/trial_balance', label: '試算表', icon: '📑' },
  { href: '/settings/company', label: '設定', icon: '⚙️' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname === '/' || pathname === '/login') {
    return <main className="min-h-screen bg-gradient-to-b from-white to-[rgba(221,160,221,0.06)]">{children}</main>;
  }

  const activeIndex = Math.max(
    NAV_ITEMS.findIndex((item) => pathname.startsWith(item.href)),
    0
  );

  const indicatorStyle: React.CSSProperties = {
    width: `calc(100% / ${NAV_ITEMS.length} - 16px)`,
    transform: `translateX(calc(${activeIndex} * (100% / ${NAV_ITEMS.length}) + 8px))`,
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[rgba(221,160,221,0.08)] via-white to-[rgba(240,128,128,0.05)]">
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-slate-200/60 backdrop-blur flex items-center justify-between px-4 transition-[box-shadow,height] duration-200 ease-out bg-white/90',
          scrolled ? 'h-14 header-elevated' : 'h-16'
        )}
        role="banner"
        aria-label="アプリヘッダー"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary-plum-700)] to-[var(--color-primary-salmon-700)] shadow-lg shadow-[rgba(108,78,108,0.25)] flex items-center justify-center text-white font-black text-lg">
            CZ
          </div>
          <div>
            <p className="text-xs text-slate-500 tracking-wide uppercase">クラズ</p>
            <p className="text-base font-bold text-slate-900">CLAS-Z</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">モバイル優先</span>
          <span className="hidden rounded-full bg-[rgba(144,104,144,0.1)] px-3 py-1 font-semibold text-[var(--color-primary-plum-800)] sm:inline">
            WCAG 2.2 AA
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-12">
        <PageTransition>
          <div className="w-full space-y-6">{children}</div>
        </PageTransition>
      </main>

      <nav
        className="safe-area-pb fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/70 bg-white/90 px-2 backdrop-blur md:hidden"
        role="navigation"
        aria-label="主要メニュー"
      >
        <div className="bottom-nav-indicator" style={indicatorStyle} aria-hidden="true" />
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex w-full flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-colors',
                isActive ? 'text-slate-900' : 'text-slate-500'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>
              <span className={cn('leading-none tracking-wide', isActive && 'font-bold')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
