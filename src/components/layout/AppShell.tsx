'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/login') {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  const navItems = [
    { href: '/home', label: 'ホーム', icon: '🏠' },
    { href: '/schedule', label: 'スケジュール', icon: '📅' },
    { href: '/rating', label: '決算書', icon: '📊' },
    { href: '/trial_balance', label: '試算表', icon: '📑' },
    { href: '/settings/company', label: '設定', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-10">
        <h1 className="font-bold text-lg text-blue-800">CLAS-Z</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center z-20 md:hidden safe-area-pb">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                "flex flex-col items-center justify-center w-full h-16 active:bg-slate-50 focus-ring rounded-none",
                isActive ? "text-blue-700" : "text-slate-500"
              )}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
