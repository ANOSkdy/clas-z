export default function MarketingHome() {
  return (
    <div className="page-container space-y-10" aria-labelledby="marketing-heading">
      <section className="space-y-4">
        <p className="text-sm tracking-[0.2em] text-[color:var(--color-text-muted)]">P1 PLATFORM</p>
        <h1 id="marketing-heading" className="text-3xl font-semibold">
          CLAS-Z Platform
        </h1>
        <p className="text-lg text-[color:var(--color-text-muted)]">
          Plum × Salmon のデザインシステムで、モバイルアップロードから PC レビューまでの共通基盤を提供します。
        </p>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-primary" href="/mobile">
            モバイル体験を見る
          </a>
          <a className="btn btn-secondary" href="/pc">
            レビュー UI を確認
          </a>
        </div>
      </section>
      <section className="card space-y-3" aria-label="基盤のポイント">
        <h2 className="text-2xl font-semibold">PLATFORM で用意されるもの</h2>
        <ul className="space-y-2 text-[color:var(--color-text-muted)]">
          <li>アクセシブルなレイアウトとデザイントークン</li>
          <li>Gemini / Airtable / Vercel Blob を包むサーバー専用ライブラリ</li>
          <li>AI と審査 API のスタブにより、次フェーズで安全に拡張可能</li>
        </ul>
      </section>
    </div>
  );
}
