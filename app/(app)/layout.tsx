import type { ReactNode } from "react";

import { appNavItems } from "./nav-items";

type Props = { children: ReactNode };

export default function AppMobileLayout({ children }: Props) {
  return (
    <div className="mobile-frame">
      <section role="region" aria-label="モバイルコンテンツ" className="p-4 space-y-4" aria-live="polite">
        {children}
      </section>
      <nav className="mobile-nav" aria-label="モバイルメインナビ">
        {appNavItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
