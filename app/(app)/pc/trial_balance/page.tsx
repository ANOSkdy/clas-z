import TBWorkspace from "./_components/TBWorkspace";

export default function TrialBalancePage() {
  return (
    <section className="space-y-6" aria-labelledby="tb-heading">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">trial balance</p>
        <h1 id="tb-heading" className="text-2xl font-semibold">
          試算表ワークスペース
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          CSV / PDF を取り込み、貸借一致を確認してから送付まで行えます。
        </p>
      </header>
      <TBWorkspace />
    </section>
  );
}
