"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EventItem = {
  id: string;
  type: string;
  source: string;
  createdAt: string;
  correlationId?: string;
  payload?: Record<string, unknown> | null;
};

type EventStreamProps = {
  initialEvents: EventItem[];
  companyId: string | null;
};

const ITEM_HEIGHT = 64;
const VIEWPORT_HEIGHT = 320;

export default function EventStream({ initialEvents, companyId }: EventStreamProps) {
  const [events, setEvents] = useState(initialEvents);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT));
  const endIndex = Math.min(events.length, startIndex + visibleCount);
  const offsetY = startIndex * ITEM_HEIGHT;
  const visibleEvents = useMemo(() => events.slice(startIndex, endIndex), [events, startIndex, endIndex]);

  const refreshEvents = useCallback(async () => {
    if (!companyId) return;
    const correlationId = crypto.randomUUID();
    const response = await fetch(`/api/rating?company=${companyId}`, {
      headers: { "x-correlation-id": correlationId },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.events)) {
      setEvents(data.events);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const interval = setInterval(() => {
      void refreshEvents();
    }, 30_000);
    return () => clearInterval(interval);
  }, [companyId, refreshEvents]);

  useEffect(() => {
    function handleUpdate(event: Event) {
      const custom = event as CustomEvent<EventItem[]>;
      if (Array.isArray(custom.detail)) {
        setEvents(custom.detail);
      }
    }
    if (typeof window === "undefined") return () => {};
    window.addEventListener("rating:events", handleUpdate as EventListener);
    return () => window.removeEventListener("rating:events", handleUpdate as EventListener);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  const formatter = useMemo(() => new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }), []);

  return (
    <section className="card space-y-4" aria-label="イベントストリーム">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">最近のイベント</h2>
        <button
          type="button"
          className="btn-secondary inline-flex min-h-[36px] items-center justify-center rounded-full px-3 text-xs"
          onClick={() => refreshEvents().catch(() => {})}
          disabled={!companyId}
        >
          手動更新
        </button>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        tabIndex={0}
        className="rounded-2xl border border-[color:var(--color-border)]"
        style={{ maxHeight: VIEWPORT_HEIGHT, overflowY: "auto" }}
      >
        <div style={{ height: events.length * ITEM_HEIGHT, position: "relative" }}>
          <ul
            className="absolute inset-x-0"
            style={{ transform: `translateY(${offsetY}px)` }}
          >
            {visibleEvents.map((event) => (
              <li
                key={event.id}
                className="border-b border-[color:var(--color-border)] px-4 py-3 last:border-b-0"
                style={{ height: ITEM_HEIGHT }}
              >
                <p className="text-sm font-semibold">{event.type}</p>
                <p className="text-xs text-[color:var(--color-text-muted)]">
                  {formatter.format(new Date(event.createdAt))} · {event.source}
                </p>
                {event.correlationId && (
                  <p className="text-[10px] text-[color:var(--color-text-muted)]">CID: {event.correlationId}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
