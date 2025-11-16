import type { ReactNode } from "react";

type Props = { children: ReactNode };

export default function PcLayout({ children }: Props) {
  return (
    <div className="pc-frame" role="application" aria-label="PC レビュー枠">
      <aside className="pc-pane" aria-label="サイドバー">
        <p className="text-sm text-[color:var(--color-text-muted)]">隊列</p>
        <strong className="text-lg">Documents</strong>
        <p className="text-xs text-[color:var(--color-text-muted)]">次フェーズで絞り込みなどを追加</p>
      </aside>
      <main id="main" role="main" className="main-pane">
        {children}
      </main>
      <aside className="pc-pane" aria-label="補助パネル">
        <p className="text-sm text-[color:var(--color-text-muted)]">コメント / 履歴</p>
        <p className="text-xs text-[color:var(--color-text-muted)]">レビュータスク連携のスペース</p>
      </aside>
    </div>
  );
}
