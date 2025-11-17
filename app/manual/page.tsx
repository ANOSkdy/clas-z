"use client";

import { useEffect } from "react";

import { sendEvent } from "@/lib/analytics-client";

export const runtime = "edge";

const sections = [
  { id: "overview", title: "概要" },
  { id: "getting-started", title: "はじめかた" },
  { id: "faq", title: "よくある質問" },
];

export default function ManualPage() {
  useEffect(() => {
    void sendEvent({ type: "manual.viewed" });
  }, []);

  const handleAnchorClick = (anchor: string) => {
    void sendEvent({ type: "manual.anchor_click", payload: { anchor } });
  };

  return (
    <div className="page-container grid gap-6 md:grid-cols-[240px,1fr]" aria-labelledby="manual-heading">
      <aside className="card space-y-3" aria-label="目次">
        <h2 className="text-lg font-semibold">目次</h2>
        <nav className="flex flex-col gap-2 text-sm" aria-label="マニュアル目次">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => handleAnchorClick(section.id)}
              className="underline-offset-4 hover:underline"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <section className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">manual</p>
          <h1 id="manual-heading" className="text-3xl font-semibold">
            CLAS-Z マニュアル
          </h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            主要なタスクの流れとトラブルシューティングのヒントをまとめています。
          </p>
        </div>

        <article className="card space-y-4" id="overview" aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="text-xl font-semibold">
            概要
          </h2>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            ホームハブからアップロード、レビュー、スケジュール管理まで移動できます。各ページのヘッダーに主要な導線を揃えました。
          </p>
        </article>

        <article className="card space-y-4" id="getting-started" aria-labelledby="getting-started-heading">
          <h2 id="getting-started-heading" className="text-xl font-semibold">
            はじめかた
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[color:var(--color-text-muted)]">
            <li>モバイルのアップロードから書類を追加します。</li>
            <li>PC レビューで確認し、必要に応じてレーティングやスケジュールを確認します。</li>
            <li>設定から会社情報を管理します。</li>
          </ol>
        </article>

        <article className="card space-y-4" id="faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-xl font-semibold">
            よくある質問
          </h2>
          <div className="space-y-2 text-sm text-[color:var(--color-text-muted)]">
            <p>アップロードに失敗する場合は、通信環境とファイル形式をご確認ください。</p>
            <p>レーティングやスケジュールが更新されない場合は、再読み込みして最新の状態を取得してください。</p>
          </div>
        </article>
      </section>
    </div>
  );
}
