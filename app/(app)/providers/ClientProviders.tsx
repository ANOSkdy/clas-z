"use client";

import { type ReactNode } from "react";

import AnalyticsProvider from "./AnalyticsProvider";
import A11yProvider from "./A11yProvider";
import PerfProvider from "./PerfProvider";
import QueryProvider from "../../providers";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <A11yProvider>
        <AnalyticsProvider>
          <PerfProvider>{children}</PerfProvider>
        </AnalyticsProvider>
      </A11yProvider>
    </QueryProvider>
  );
}
