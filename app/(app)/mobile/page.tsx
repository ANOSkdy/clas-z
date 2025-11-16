export default function MobileHome() {
  return (
    <section className="space-y-4" aria-labelledby="mobile-home-heading">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          uploader
        </p>
        <h1 id="mobile-home-heading" className="text-xl font-semibold">
          モバイルホーム
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          ここから領収書や証憑をアップロードする体験を組み立てます。
        </p>
      </header>
      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">直近のアップロード</h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          次フェーズで Airtable の Documents テーブルと接続予定です。
        </p>
      </div>
    </section>
  );
}
