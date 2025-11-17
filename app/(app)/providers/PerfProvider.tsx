"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type VitalPayload = {
  name: string;
  value: number;
  rating?: string;
  id?: string;
  path?: string;
};

const CLS_THRESHOLD = { good: 0.1, needsImprovement: 0.25 };
const LCP_THRESHOLD = { good: 2500, needsImprovement: 4000 };
const INP_THRESHOLD = { good: 200, needsImprovement: 500 };
const TTFB_THRESHOLD = { good: 800, needsImprovement: 1800 };

export default function PerfProvider() {
  const pathname = usePathname();
  const correlationId = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    correlationId.current = crypto.randomUUID();
  }, [pathname]);

  useEffect(() => {
    let clsValue = 0;
    let clsTimeout: number | undefined;
    let lcpSent = false;
    let inpSent = false;
    let clsSent = false;

    const sendVital = (payload: VitalPayload) => {
      void fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": correlationId.current,
        },
        body: JSON.stringify({
          type: "perf.vitals",
          payload: { ...payload, path: pathname, id: correlationId.current },
        }),
        keepalive: true,
      }).catch(() => {
        /* noop */
      });
    };

    const ratingFor = (name: string, value: number) => {
      if (name === "LCP") return value <= LCP_THRESHOLD.good ? "good" : value <= LCP_THRESHOLD.needsImprovement ? "needs-improvement" : "poor";
      if (name === "CLS") return value <= CLS_THRESHOLD.good ? "good" : value <= CLS_THRESHOLD.needsImprovement ? "needs-improvement" : "poor";
      if (name === "INP") return value <= INP_THRESHOLD.good ? "good" : value <= INP_THRESHOLD.needsImprovement ? "needs-improvement" : "poor";
      if (name === "TTFB") return value <= TTFB_THRESHOLD.good ? "good" : value <= TTFB_THRESHOLD.needsImprovement ? "needs-improvement" : "poor";
      return "unknown";
    };

    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      const ttfb = navEntry.responseStart;
      sendVital({ name: "TTFB", value: ttfb, rating: ratingFor("TTFB", ttfb) });
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint" && !lcpSent) {
          lcpSent = true;
          sendVital({ name: "LCP", value: entry.startTime, rating: ratingFor("LCP", entry.startTime) });
        }
        if (entry.entryType === "layout-shift") {
          const shift = entry as LayoutShift;
          if (!shift.hadRecentInput) {
            clsValue += shift.value;
            if (!clsSent) {
              if (clsTimeout) {
                clearTimeout(clsTimeout);
              }
              clsTimeout = window.setTimeout(() => {
                clsSent = true;
                sendVital({ name: "CLS", value: clsValue, rating: ratingFor("CLS", clsValue) });
              }, 1500);
            }
          }
        }
        if (entry.entryType === "event" && !inpSent) {
          const interaction = entry as PerformanceEventTiming;
          if (interaction.interactionId) {
            inpSent = true;
            sendVital({ name: "INP", value: interaction.duration, rating: ratingFor("INP", interaction.duration) });
          }
        }
      }
    });

    observer.observe({ type: "largest-contentful-paint", buffered: true });
    observer.observe({ type: "layout-shift", buffered: true });
    try {
      observer.observe({ type: "event", buffered: true });
    } catch {
      // ignore if not supported
    }

    return () => {
      observer.disconnect();
      if (clsTimeout) {
        clearTimeout(clsTimeout);
      }
    };
  }, [pathname]);

  return null;
}
