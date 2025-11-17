"use client";

import { useEffect, type ReactNode } from "react";

import { sendEvent } from "@/lib/analytics-client";

const correlationId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;

export default function PerfProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let clsValue = 0;
    let clsId: string | undefined;
    let sentCls = false;

    const send = async (metric: { name: string; value: number; rating?: string; id?: string }) => {
      const path = window.location.pathname;
      await sendEvent({
        type: "perf.vitals",
        source: "web",
        payload: {
          id: metric.id ?? correlationId,
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          path,
        },
        correlationId,
      }).catch(() => {});
    };

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const shiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput?: boolean; id?: string };
        const shift = shiftEntry.value;
        if (shiftEntry.hadRecentInput) continue;
        clsValue += shift;
        clsId = shiftEntry.id;
      }
    });

    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const last = entries[entries.length - 1] as (PerformanceEntry & { id?: string }) | undefined;
      if (!last) return;
      void send({ name: "LCP", value: last.startTime, rating: "good", id: last.id });
    });

    const inpObserver = new PerformanceObserver((entryList) => {
      const first = entryList.getEntries()[0] as PerformanceEventTiming | undefined;
      if (!first) return;
      void send({ name: "INP", value: first.duration, id: first.name });
    });

    try {
      clsObserver.observe({ type: "layout-shift", buffered: true });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      inpObserver.observe({ type: "event", buffered: true });
    } catch (error) {
      console.warn("PerformanceObserver not supported", error);
    }

    const navigationEntries = performance.getEntriesByType("navigation");
    const nav = navigationEntries[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      void send({ name: "TTFB", value: nav.responseStart });
    }

    const flushCls = () => {
      if (sentCls) return;
      sentCls = true;
      if (clsValue > 0) {
        void send({ name: "CLS", value: clsValue, id: clsId });
      }
    };

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushCls();
      }
    });
    window.addEventListener("pagehide", flushCls);
    window.addEventListener("beforeunload", flushCls);

    return () => {
      try {
        clsObserver.disconnect();
        lcpObserver.disconnect();
        inpObserver.disconnect();
      } catch (error) {
        console.warn("Failed to disconnect perf observers", error);
      }
    };
  }, []);

  return <>{children}</>;
}
