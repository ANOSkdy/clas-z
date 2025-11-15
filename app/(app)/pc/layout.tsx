export default function PcLayout({ children }:{ children: React.ReactNode }) {
  return (
    <div className="h-[calc(100svh-48px)] grid grid-cols-[240px_1fr_320px]">
      <aside className="border-r p-3">一覧（プレースホルダ）</aside>
      <main id="main" className="p-4">{children}</main>
      <aside className="border-l p-3">補助（コメント/履歴）</aside>
    </div>
  );
}