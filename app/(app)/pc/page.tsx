import Link from "next/link";

export default function PcHome() {
  return (
    <section className="space-y-4" aria-labelledby="pc-home-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          reviewer
        </p>
        <h1 id="pc-home-heading" className="text-2xl font-semibold">
          PC レビューシェル
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          3 ペイン構成で Documents / プレビュー / 監査ログを安全に積み上げられるようにします。
        </p>
      </header>
      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">これから実装される内容</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm text-[color:var(--color-text-muted)]">
          <li>OCR + Gemini による分類結果</li>
          <li>レビュータスクと Journal Entries の連動</li>
          <li>通知 / メッセージのコンテキスト表示</li>
        </ul>
      </div>
      <div className="card space-y-3" aria-label="レビュー導線">
        <p className="text-sm text-[color:var(--color-text-muted)]">最新の PC レビュー体験はこちらから</p>
        <Link href="/pc/review" className="btn-primary inline-flex items-center justify-center text-sm">
          PC Review ワークスペースへ
        </Link>
      </div>
    </section>
  );
}
