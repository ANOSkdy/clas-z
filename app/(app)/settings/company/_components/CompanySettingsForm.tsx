"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CompanySettingsSchema, CompanyUpdateRequestSchema } from "@/lib/schemas/settings";
import { useCompanySettings } from "./CompanySettingsProvider";

const formatter = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" });

const defaultForm = {
  name: "",
  legalName: "",
  billingEmail: "",
  timezone: "",
  taxId: "",
};

type FormState = typeof defaultForm;
type FieldErrors = Partial<Record<keyof FormState, string>>;

const newCorrelationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function CompanySettingsForm() {
  const { company, setCompany, loading, error, refresh } = useCompanySettings();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name,
      legalName: company.legalName ?? "",
      billingEmail: company.billingEmail ?? "",
      timezone: company.timezone ?? "",
      taxId: company.taxId ?? "",
    });
  }, [company]);

  useEffect(() => {
    if (formError || Object.values(fieldErrors).some(Boolean)) {
      errorSummaryRef.current?.focus();
    }
  }, [formError, fieldErrors]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const sanitize = () => ({
    name: form.name.trim(),
    legalName: form.legalName.trim() || undefined,
    billingEmail: form.billingEmail.trim() || undefined,
    timezone: form.timezone.trim() || undefined,
    taxId: form.taxId.trim() || undefined,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const parsed = CompanyUpdateRequestSchema.safeParse(sanitize());
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const nextErrors: FieldErrors = {};
      for (const key of Object.keys(flat.fieldErrors) as (keyof FormState)[]) {
        const message = flat.fieldErrors[key]?.[0];
        if (message) nextErrors[key] = message;
      }
      setFieldErrors(nextErrors);
      setFormError("入力内容を確認してください");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": newCorrelationId(),
        },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json?.error?.message ?? "会社設定の更新に失敗しました";
        throw new Error(message);
      }
      const parsedCompany = CompanySettingsSchema.safeParse(json.company ?? json);
      if (!parsedCompany.success) {
        throw new Error("会社設定の形式が不正です");
      }
      setCompany(parsedCompany.data);
      setToast("会社設定を保存しました");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "会社設定の更新に失敗しました";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const lastUpdated = useMemo(() => {
    if (!company?.updatedAt) return null;
    try {
      return formatter.format(new Date(company.updatedAt));
    } catch {
      return company.updatedAt;
    }
  }, [company]);

  if (loading && !company) {
    return (
      <div className="card" role="status" aria-live="polite" aria-busy>
        <p className="text-sm text-[color:var(--color-text-muted)]">会社情報を読み込んでいます...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="card space-y-3" role="alert">
        <p className="text-sm text-[color:var(--color-text-muted)]">会社情報を取得できませんでした。</p>
        <button type="button" className="btn-secondary text-sm" onClick={() => void refresh()}>
          再試行
        </button>
        {error && <p className="text-xs text-[color:var(--color-error-text,#991B1B)]">{error}</p>}
      </div>
    );
  }

  const hasErrors = Boolean(formError) || Object.values(fieldErrors).some(Boolean);

  return (
    <form className="card space-y-6" onSubmit={handleSubmit} aria-busy={saving} noValidate>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">会社情報</h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">請求書・法務関連のデータを管理します。</p>
        <div className="text-xs text-[color:var(--color-text-muted)]">
          <span>状態: {company.status === "deleted" ? "論理削除済み" : "アクティブ"}</span>
          {lastUpdated && <span className="ml-3">最終更新: {lastUpdated}</span>}
        </div>
      </div>
      {hasErrors && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-[color:var(--color-error-border,#FCA5A5)] bg-[color:var(--color-error-bg,#FEF2F2)] p-4 text-sm"
        >
          <p className="font-semibold">入力内容を確認してください</p>
          {formError && <p>{formError}</p>}
          <ul className="mt-2 list-disc pl-5">
            {Object.entries(fieldErrors).map(([key, message]) =>
              message ? (
                <li key={key}>{message}</li>
              ) : null,
            )}
          </ul>
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="company-name">
            会社名
          </label>
          <input
            id="company-name"
            name="name"
            type="text"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.name}
            onChange={handleChange("name")}
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "company-name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="company-name-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="company-legal-name">
            法人名 (任意)
          </label>
          <input
            id="company-legal-name"
            name="legalName"
            type="text"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.legalName}
            onChange={handleChange("legalName")}
            aria-invalid={Boolean(fieldErrors.legalName)}
            aria-describedby={fieldErrors.legalName ? "company-legal-name-error" : undefined}
          />
          {fieldErrors.legalName && (
            <p id="company-legal-name-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.legalName}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="company-billing-email">
            請求連絡先 (任意)
          </label>
          <input
            id="company-billing-email"
            name="billingEmail"
            type="email"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.billingEmail}
            onChange={handleChange("billingEmail")}
            aria-invalid={Boolean(fieldErrors.billingEmail)}
            aria-describedby={fieldErrors.billingEmail ? "company-billing-email-error" : undefined}
          />
          {fieldErrors.billingEmail && (
            <p id="company-billing-email-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.billingEmail}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="company-timezone">
            タイムゾーン (任意)
          </label>
          <input
            id="company-timezone"
            name="timezone"
            type="text"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.timezone}
            onChange={handleChange("timezone")}
            aria-invalid={Boolean(fieldErrors.timezone)}
            aria-describedby={fieldErrors.timezone ? "company-timezone-error" : undefined}
          />
          {fieldErrors.timezone && (
            <p id="company-timezone-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.timezone}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="company-tax-id">
            税番号 (任意)
          </label>
          <input
            id="company-tax-id"
            name="taxId"
            type="text"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.taxId}
            onChange={handleChange("taxId")}
            aria-invalid={Boolean(fieldErrors.taxId)}
            aria-describedby={fieldErrors.taxId ? "company-tax-id-error" : undefined}
          />
          {fieldErrors.taxId && (
            <p id="company-tax-id-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.taxId}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary text-sm" disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => {
            if (!company) return;
            setForm({
              name: company.name,
              legalName: company.legalName ?? "",
              billingEmail: company.billingEmail ?? "",
              timezone: company.timezone ?? "",
              taxId: company.taxId ?? "",
            });
            setFieldErrors({});
            setFormError(null);
          }}
        >
          変更をリセット
        </button>
        {toast && (
          <span role="status" aria-live="polite" className="text-sm text-[color:var(--color-text-muted)]">
            {toast}
          </span>
        )}
      </div>
    </form>
  );
}
