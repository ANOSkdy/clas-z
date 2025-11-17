import HomeTabs from "./_components/HomeTabs";

export const runtime = "edge";

export default function HomePage() {
  return (
    <div className="page-container space-y-6" aria-labelledby="home-heading">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">home</p>
        <h1 id="home-heading" className="text-2xl font-semibold">
          ワークスペース ハブ
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          アップロードからレビュー、スケジュールまで横断的にアクセスできます。
        </p>
      </div>
      <HomeTabs />
    </div>
  );
}
