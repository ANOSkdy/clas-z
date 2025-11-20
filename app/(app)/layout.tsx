import type { ReactNode } from "react";

type Props = { children: ReactNode };

const navItems = [
  { label: "ホーム", href: "/mobile" },
  { label: "アップロード", href: "/mobile/upload" },
  { label: "タスク", href: "/mobile/tasks" },
  { label: "チャット", href: "/mobile/chat" },
  { label: "プロフィール", href: "/mobile/profile" },
];

export default function AppMobileLayout({ children }: Props) {
  return (
    <div className="mobile-frame">
      <section role="region" aria-label="モバイルコンテンツ" className="p-4 space-y-4" aria-live="polite">
        {children}
      </section>
      <nav className="mobile-nav" aria-label="モバイルメインナビ">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
