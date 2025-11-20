import type { ReactNode } from "react";

import BottomNav from "./bottom-nav";

type MobileShellProps = {
  children: ReactNode;
};

export default function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-neutral-900">
      <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-white text-neutral-900 shadow-[0_10px_45px_rgba(0,0,0,0.35)] sm:rounded-2xl sm:border sm:border-white/10">
        <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 pb-3 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">CLAS-Z</p>
            <h1 className="text-lg font-semibold text-neutral-900">モバイルデモ</h1>
          </div>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            Action
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-white via-white to-neutral-50 px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-4">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
