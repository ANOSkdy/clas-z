"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sendEvent } from "@/lib/analytics-client";
import { appNavItems, type AppNavItem } from "@/app/(app)/nav-items";

export default function AppHeader() {
  const pathname = usePathname();

  const isActive = (href: AppNavItem["href"]) => pathname === href || pathname.startsWith(`${href}/`);

  const handleClick = (href: string) => {
    void sendEvent({ type: "nav.header_click", payload: { href, from: pathname } });
  };

  return (
    <header className="shell-header" role="banner">
      <a href="#main" className="skip-link">
        メインコンテンツへスキップ
      </a>
      <div>
        <Link href="/home" className="font-semibold tracking-wide">
          CLAS-Z
        </Link>
        <p className="text-sm text-[color:var(--color-text-muted)]">会計書類の安心ルート</p>
      </div>
      <nav aria-label="グローバルナビ" className="flex flex-wrap items-center gap-2 text-sm md:gap-4">
        {appNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            onClick={() => handleClick(item.href)}
            className={`underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)] ${
              isActive(item.href) ? "font-semibold text-[color:var(--color-primary-plum-700)]" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
