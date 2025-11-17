"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type A11yContextValue = {
  announce: (message: string) => void;
};

const A11yContext = createContext<A11yContextValue | null>(null);

export function useAnnouncer() {
  const ctx = useContext(A11yContext);
  if (!ctx) {
    throw new Error("useAnnouncer must be used within A11yProvider");
  }
  return ctx.announce;
}

export default function A11yProvider({ children }: { children: ReactNode }) {
  const [liveMessage, setLiveMessage] = useState("");

  const announce = useCallback((message: string) => {
    setLiveMessage(message);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <A11yContext.Provider value={value}>
      <div
        aria-live="polite"
        role="status"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {liveMessage}
      </div>
      {children}
    </A11yContext.Provider>
  );
}
