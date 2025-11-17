"use client";

import { useEffect, useState } from "react";
import type React from "react";

import type { ScheduleEvent } from "@/lib/schemas/schedule";

type Props = {
  open: boolean;
  initialValue?: ScheduleEvent;
  onSave: (input: Partial<ScheduleEvent>) => void;
  onClose: () => void;
};

export default function EventEditor({ open, initialValue, onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("");
  const [attendees, setAttendees] = useState("");

  useEffect(() => {
    if (initialValue) {
      setTitle(initialValue.title);
      setDescription(initialValue.description ?? "");
      setStartsAt(initialValue.startsAt.slice(0, 16));
      setEndsAt(initialValue.endsAt.slice(0, 16));
      setLocation(initialValue.location ?? "");
      setTimezone(initialValue.timezone ?? "");
      setAttendees((initialValue.attendees ?? []).join(", "));
    } else {
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setLocation("");
      setTimezone("");
      setAttendees("");
    }
  }, [initialValue, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startsAt || !endsAt) return;
    onSave({
      title,
      description: description || undefined,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      location: location || undefined,
      timezone: timezone || undefined,
      attendees: attendees
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal>
      <form onSubmit={handleSubmit} className="card w-[480px] space-y-3" aria-label="イベント編集フォーム">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initialValue ? "イベントを編集" : "イベントを作成"}</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-2">
            閉じる
          </button>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">タイトル</span>
          <input
            required
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 定例ミーティング"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">開始</span>
          <input
            required
            type="datetime-local"
            className="input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">終了</span>
          <input
            required
            type="datetime-local"
            className="input"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">場所</span>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="オンライン" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">タイムゾーン</span>
          <input className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Tokyo" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">参加者 (カンマ区切り)</span>
          <input
            className="input"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="user@example.com, another@example.com"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">メモ</span>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="議題や背景メモ"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary px-4 py-2" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn-primary px-4 py-2">
            {initialValue ? "更新" : "作成"}
          </button>
        </div>
      </form>
    </div>
  );
}
