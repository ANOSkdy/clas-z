"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { AnalyticsEvent } from "./schemas/analytics";

export async function sendEvent(event: Parameters<typeof AnalyticsEvent.parse>[0]) {
  const parsed = AnalyticsEvent.parse(event);
  const correlationId = parsed.correlationId ?? crypto.randomUUID();
  const body = { ...parsed, correlationId };

  void fetch("/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export function usePageView(delayMs = 200) {
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      void sendEvent({
        type: "nav.page_view",
        payload: { path: pathname },
      });
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname, delayMs]);
}
