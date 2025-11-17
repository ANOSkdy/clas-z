"use client";

import { useEffect, useRef, useState } from "react";
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
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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
    setSubmitted(false);
  }, [initialValue, open]);

  useEffect(() => {
    if (open && dialogRef.current) {
      const dialogEl = dialogRef.current;
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      focusables[0]?.focus();
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab" || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      dialogEl.addEventListener("keydown", handleKeyDown);
      return () => dialogEl.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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

  const errorId = "event-editor-error";

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-editor-heading"
      aria-describedby="event-editor-description"
    >
      <form onSubmit={handleSubmit} className="card w-[480px] space-y-3" aria-label="イベント編集フォーム">
        <div className="flex items-center justify-between">
          <h2 id="event-editor-heading" className="text-lg font-semibold">
            {initialValue ? "イベントを編集" : "イベントを作成"}
          </h2>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-2">
            閉じる
          </button>
        </div>
        <p id="event-editor-description" className="sr-only">
          イベントの基本情報を入力してください。
        </p>
        <label className="space-y-1 text-sm" htmlFor="event-title">
          <span className="font-medium">タイトル</span>
          <input
            id="event-title"
            required
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 定例ミーティング"
            aria-invalid={submitted && !title}
            aria-errormessage={submitted && !title ? errorId : undefined}
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-start">
          <span className="font-medium">開始</span>
          <input
            id="event-start"
            required
            type="datetime-local"
            className="input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            aria-invalid={submitted && !startsAt}
            aria-errormessage={submitted && !startsAt ? errorId : undefined}
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-end">
          <span className="font-medium">終了</span>
          <input
            id="event-end"
            required
            type="datetime-local"
            className="input"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            aria-invalid={submitted && !endsAt}
            aria-errormessage={submitted && !endsAt ? errorId : undefined}
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-location">
          <span className="font-medium">場所</span>
          <input
            id="event-location"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="オンライン"
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-timezone">
          <span className="font-medium">タイムゾーン</span>
          <input
            id="event-timezone"
            className="input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Tokyo"
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-attendees">
          <span className="font-medium">参加者 (カマ区切り)</span>
          <input
            id="event-attendees"
            className="input"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="user@example.com, another@example.com"
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-notes">
          <span className="font-medium">メモ</span>
          <textarea
            id="event-notes"
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="議題や背景メモ"
          />
        </label>
        {submitted && (!title || !startsAt || !endsAt) && (
          <p id={errorId} role="alert" className="text-sm text-[color:var(--color-error-text,#991B1B)]">
            必須項目を入力してください。
          </p>
        )}
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
