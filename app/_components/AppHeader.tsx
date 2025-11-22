"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { sendEvent } from "@/lib/analytics-client";

const navItems = [
  { label: "ホーム", href: "/mobile" },
  { label: "アップロード", href: "/mobile/upload" },
  { label: "タスク", href: "/mobile/tasks" },
  { label: "チャット", href: "/mobile/chat" },
  { label: "プロフィール", href: "/mobile/profile" },
  { label: "会社設定", href: "/settings/company" },
  { label: "マニュアル", href: "/manual" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleClick = (href: string) => {
    void sendEvent({ type: "nav.header_click", payload: { href, from: pathname } });
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="shell-header" role="banner">
      <a href="#main" className="skip-link">
        メインコンテンツへスキップ
      </a>
      <div className="header-top">
        <div>
          <Link href="/home" className="font-semibold tracking-wide">
            CLAS-Z
          </Link>
          <p className="text-sm text-[color:var(--color-text-muted)]">会計書類の安心ルート</p>
        </div>
        <button
          type="button"
          className="header-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="global-nav"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <span aria-hidden className="header-toggle-icon">
            <span />
            <span />
            <span />
          </span>
          <span className="text-sm">メニュー</span>
        </button>
      </div>
      <nav
        id="global-nav"
        aria-label="グローバルナビ"
        className={`header-nav text-sm ${isMenuOpen ? "is-open" : ""}`}
      >
        {navItems.map((item) => (
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
