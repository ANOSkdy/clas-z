const highlights = [
  {
    title: "ダッシュボード",
    description: "今日のフォーカスを確認して、チームの進捗をひと目で把握。",
  },
  {
    title: "リアルタイム更新",
    description: "通知やアクティビティがライブで流れるストリーム体験。",
  },
  {
    title: "オフライン対応",
    description: "地下鉄でも入力を失わないローカル保存＆再送キュー。",
  },
];

const updates = Array.from({ length: 12 }, (_, index) => ({
  title: `アップデート #${index + 1}`,
  timestamp: "たった今",
  body: "ネイティブアプリのようなスムーズさを目指して最適化を進行中。",
}));

export default function Page() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-neutral-900 p-6 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Native App-like</p>
        <h2 className="mt-2 text-2xl font-bold leading-tight">CLAS-Z Mobile Shell</h2>
        <p className="mt-3 text-sm text-white/80">
          スクロールはメイン領域のみ、セーフエリア対応のヘッダー＆ボトムナビで、
          モバイル専用体験を Next.js + Tailwind で再現します。
        </p>
        <div className="mt-4 flex gap-3">
          <button className="min-h-[44px] min-w-[44px] rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow">
            今すぐ試す
          </button>
          <button className="min-h-[44px] min-w-[44px] rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white">
            デザインを見る
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-neutral-900">ハイライト</h3>
        <div className="grid grid-cols-1 gap-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <h4 className="text-base font-semibold text-neutral-900">{item.title}</h4>
              <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-neutral-900">アップデート</h3>
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {updates.map((item) => (
            <article key={item.title} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-neutral-900">{item.title}</h4>
                <span className="text-xs font-medium text-neutral-500">{item.timestamp}</span>
              </div>
              <p className="text-sm text-neutral-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
