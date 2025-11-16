"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CompanySettingsSchema, type CompanySettings } from "@/lib/schemas/settings";

const CompanySettingsContext = createContext<{
  company: CompanySettings | null;
  setCompany: (value: CompanySettings) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
} | null>(null);

const defaultError = "会社情報の取得に失敗しました";

export default function CompanySettingsProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/settings/company", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json?.error?.message ?? defaultError;
        throw new Error(message);
      }
      const parsed = CompanySettingsSchema.safeParse(json.company ?? json);
      if (!parsed.success) {
        throw new Error(defaultError);
      }
      if (!signal?.aborted) {
        setCompanyState(parsed.data);
      }
    } catch (fetchError) {
      if (signal?.aborted) return;
      const message = fetchError instanceof Error ? fetchError.message : defaultError;
      setError(message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCompany(controller.signal);
    return () => controller.abort();
  }, [fetchCompany]);

  const refresh = useCallback(async () => {
    await fetchCompany();
  }, [fetchCompany]);

  const setCompany = useCallback((value: CompanySettings) => {
    setCompanyState(value);
  }, []);

  const value = useMemo(
    () => ({
      company,
      setCompany,
      refresh,
      loading,
      error,
    }),
    [company, setCompany, refresh, loading, error],
  );

  return <CompanySettingsContext.Provider value={value}>{children}</CompanySettingsContext.Provider>;
}

export function useCompanySettings() {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error("CompanySettingsContext が見つかりません");
  }
  return context;
}
