"use client";

import Link from "next/link";
import { useState } from "react";

import { sendEvent } from "@/lib/analytics-client";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work" },
  { id: "docs", label: "Docs" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const quickActions = [
  { label: "最近のレビュー", href: "/pc/review", action: "review" },
  { label: "レーティング", href: "/pc/rating", action: "rating" },
  { label: "スケジュール", href: "/pc/schedule", action: "schedule" },
];

export default function HomeTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    void sendEvent({ type: "nav.tab_change", payload: { tab } });
  };

  const handleQuickAction = (action: string, href: string) => {
    void sendEvent({ type: "home.quick_action_click", payload: { action, href } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="ホームタブ">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              className={`btn btn-secondary text-sm ${selected ? "btn-primary" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="overview-panel" aria-labelledby="overview" hidden={activeTab !== "overview"} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-2">
            <h2 className="text-lg font-semibold">ドキュメントのアップロード</h2>
            <p className="text-sm text-[color:var(--color-text-muted)]">スマートフォンから即アップロード。</p>
            <Link href="/mobile/upload" className="btn btn-primary text-sm" onClick={() => handleQuickAction("upload", "/mobile/upload")}>
              アップロードへ
            </Link>
          </div>
          <div className="card space-y-2">
            <h2 className="text-lg font-semibold">レビューの進行</h2>
            <p className="text-sm text-[color:var(--color-text-muted)]">PC レビュー体験をすぐ試せます。</p>
            <Link href="/pc/review" className="btn btn-secondary text-sm" onClick={() => handleQuickAction("review", "/pc/review")}>
              レビューへ
            </Link>
          </div>
        </div>
      </div>

      <div role="tabpanel" id="work-panel" aria-labelledby="work" hidden={activeTab !== "work"} className="space-y-4">
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold">ショートカット</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="btn btn-secondary text-sm"
                onClick={() => handleQuickAction(action.action, action.href)}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div role="tabpanel" id="docs-panel" aria-labelledby="docs" hidden={activeTab !== "docs"} className="space-y-4">
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold">マニュアル</h2>
          <p className="text-sm text-[color:var(--color-text-muted)]">基本的な導線と FAQ のまとめ。</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/manual#overview" className="btn btn-secondary" onClick={() => handleQuickAction("manual_overview", "/manual#overview")}>
              概要を見る
            </Link>
            <Link href="/manual#getting-started" className="btn btn-secondary" onClick={() => handleQuickAction("manual_getting_started", "/manual#getting-started")}>
              はじめる
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
