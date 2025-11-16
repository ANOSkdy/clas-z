import { TrialBalanceApp } from "./_components/TrialBalanceApp";

export default function TrialBalancePage() {
  return (
    <section className="space-y-6" aria-labelledby="tb-page-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">workspace</p>
        <h1 id="tb-page-heading" className="text-2xl font-semibold">
          Trial Balance (P4)
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          CSV / PDF をインポートし、勘定別の借方・貸方を検証して Airtable に登録・送付まで進めます。
        </p>
      </header>
      <TrialBalanceApp />
    </section>
  );
}
