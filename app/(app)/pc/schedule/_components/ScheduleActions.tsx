"use client";

import { useState } from "react";

import type { ScheduleEvent } from "@/lib/schemas/schedule";

type Props = {
  onCreate: () => void;
  onProposals: () => Promise<Partial<ScheduleEvent>[]>;
  onAcceptProposal: (proposal: Partial<ScheduleEvent>) => Promise<void>;
  icsUrl?: string;
};

export default function ScheduleActions({ onCreate, onProposals, onAcceptProposal, icsUrl }: Props) {
  const [proposals, setProposals] = useState<Partial<ScheduleEvent>[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setMessage(null);
    const items = await onProposals();
    setProposals(items);
    setLoading(false);
    if (!items.length) {
      setMessage("提案がありませんでした");
    }
  };

  return (
    <div className="card space-y-3" aria-label="スケジュール操作">
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary px-4 py-3" onClick={onCreate} aria-label="イベントを作成">
          新規イベント
        </button>
        <button className="btn-secondary px-4 py-3" onClick={handleSuggest} aria-label="AI 提案を取得">
          AI におまかせ
        </button>
        {icsUrl && (
          <button
            className="btn-secondary px-4 py-3"
            onClick={() => {
              void navigator.clipboard.writeText(icsUrl);
              setMessage("ICS URL をコピーしました");
            }}
            aria-label="ICS URL をコピー"
          >
            ICS URL をコピー
          </button>
        )}
      </div>
      {message && <p className="text-sm text-[color:var(--color-text-muted)]">{message}</p>}
      {loading && <p className="text-sm">AI が提案を準備中...</p>}
      {!!proposals.length && (
        <div className="space-y-2" aria-label="提案されたイベント">
          <h3 className="text-sm font-semibold">提案されたイベント</h3>
          <ul className="space-y-2">
            {proposals.map((proposal, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[color:var(--color-border)] p-3"
              >
                <div>
                  <p className="font-medium">{proposal.title}</p>
                  <p className="text-xs text-[color:var(--color-text-muted)]">{proposal.description}</p>
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    {proposal.startsAt ? new Date(proposal.startsAt).toLocaleString() : "未設定"}
                  </p>
                </div>
                <button
                  className="btn-primary px-3 py-2"
                  onClick={async () => {
                    await onAcceptProposal(proposal);
                    setMessage("提案を採用しました");
                  }}
                  aria-label={`${proposal.title ?? "イベント"} を追加`}
                >
                  追加
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
