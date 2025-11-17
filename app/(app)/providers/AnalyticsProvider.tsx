"use client";

import { type ReactNode } from "react";

import { usePageView } from "@/lib/analytics-client";

export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  usePageView();

  return <>{children}</>;
}
