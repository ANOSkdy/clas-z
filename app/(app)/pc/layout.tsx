import type { ReactNode } from "react";

type Props = { children: ReactNode };

export default function PcLayout({ children }: Props) {
  return (
    <div className="mobile-page" role="application" aria-label="モバイルワークスペース">
      <section role="region" aria-label="メインワークスペース" className="mobile-page__content">
        {children}
      </section>
    </div>
  );
}
