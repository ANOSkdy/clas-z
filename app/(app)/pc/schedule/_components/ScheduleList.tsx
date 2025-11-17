"use client";

import type { ScheduleEvent } from "@/lib/schemas/schedule";

type Props = {
  events: ScheduleEvent[];
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (eventId: string) => void;
};

export default function ScheduleList({ events, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-auto" role="region" aria-label="スケジュール一覧">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-[color:var(--color-text-muted)]">
          <tr>
            <th className="py-2 pr-3">タイトル</th>
            <th className="py-2 pr-3">開始</th>
            <th className="py-2 pr-3">終了</th>
            <th className="py-2 pr-3">ステータス</th>
            <th className="py-2 pr-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-[color:var(--color-border)]">
              <td className="py-2 pr-3 font-medium">{event.title}</td>
              <td className="py-2 pr-3">{new Date(event.startsAt).toLocaleString()}</td>
              <td className="py-2 pr-3">{new Date(event.endsAt).toLocaleString()}</td>
              <td className="py-2 pr-3 capitalize">{event.status}</td>
              <td className="py-2 pr-3">
                <div className="flex gap-2">
                  <button
                    className="btn-secondary px-3 py-2"
                    onClick={() => onEdit(event)}
                    aria-label={`${event.title} を編集`}
                  >
                    編集
                  </button>
                  <button
                    className="btn-secondary px-3 py-2"
                    onClick={() => onDelete(event.id)}
                    aria-label={`${event.title} を削除`}
                  >
                    削除
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!events.length && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-[color:var(--color-text-muted)]">
                イベントがまだありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
