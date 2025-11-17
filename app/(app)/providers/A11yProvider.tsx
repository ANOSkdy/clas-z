"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const AnnounceContext = createContext<(message: string) => void>(() => {});

export function useAnnounce() {
  return useContext(AnnounceContext);
}

export default function A11yProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((text: string) => {
    setMessage(text);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  const value = useMemo(() => announce, [announce]);

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
