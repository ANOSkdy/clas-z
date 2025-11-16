"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CustomerProfileSchema, CustomerUpdateRequestSchema, type CustomerProfile } from "@/lib/schemas/settings";

const defaultForm = {
  displayName: "",
  email: "",
  phone: "",
  notificationEmail: "",
};

type FormState = typeof defaultForm;
type FieldErrors = Partial<Record<keyof FormState, string>>;

const formatter = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" });

const correlationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function CustomerEditForm() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/customer", {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = json?.error?.message ?? "プロフィールの取得に失敗しました";
          throw new Error(message);
        }
        const parsed = CustomerProfileSchema.safeParse(json.customer ?? json);
        if (!parsed.success) {
          throw new Error("プロフィールの形式が不正です");
        }
        setProfile(parsed.data);
        setForm({
          displayName: parsed.data.displayName,
          email: parsed.data.email,
          phone: parsed.data.phone ?? "",
          notificationEmail: parsed.data.notificationEmail ?? "",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "プロフィールの取得に失敗しました";
        setFormError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    void loadProfile();
    return () => controller.abort();
  }, []);

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
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetErrors = () => {
    setFieldErrors({});
    setFormError(null);
  };

  const toPayload = (): Record<string, unknown> => ({
    displayName: form.displayName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    notificationEmail: form.notificationEmail.trim() || undefined,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();
    const parsed = CustomerUpdateRequestSchema.safeParse(toPayload());
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
      const response = await fetch("/api/customer", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": correlationId(),
        },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json?.error?.message ?? "プロフィールの更新に失敗しました";
        throw new Error(message);
      }
      const parsedProfile = CustomerProfileSchema.safeParse(json.customer ?? json);
      if (!parsedProfile.success) {
        throw new Error("プロフィールの形式が不正です");
      }
      setProfile(parsedProfile.data);
      setForm({
        displayName: parsedProfile.data.displayName,
        email: parsedProfile.data.email,
        phone: parsedProfile.data.phone ?? "",
        notificationEmail: parsedProfile.data.notificationEmail ?? "",
      });
      setToast("プロフィールを保存しました");
    } catch (error) {
      const message = error instanceof Error ? error.message : "プロフィールの更新に失敗しました";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const lastUpdated = useMemo(() => {
    if (!profile?.updatedAt) return null;
    try {
      return formatter.format(new Date(profile.updatedAt));
    } catch {
      return profile.updatedAt;
    }
  }, [profile]);

  if (loading && !profile) {
    return (
      <div className="card" role="status" aria-live="polite" aria-busy>
        <p className="text-sm text-[color:var(--color-text-muted)]">プロフィールを読み込んでいます...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card space-y-3" role="alert">
        <p className="text-sm text-[color:var(--color-text-muted)]">プロフィール情報を表示できませんでした。</p>
        <button type="button" className="btn-secondary text-sm" onClick={() => location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  const formHasErrors = Boolean(formError) || Object.values(fieldErrors).some(Boolean);

  return (
    <form className="card space-y-6" onSubmit={handleSubmit} aria-busy={saving} noValidate>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">基本情報</h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">通知で利用する連絡先を常に最新の状態に保ちましょう。</p>
        {lastUpdated && (
          <p className="text-xs text-[color:var(--color-text-muted)]">最終更新: {lastUpdated}</p>
        )}
      </div>
      {formHasErrors && (
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
          <label className="text-sm font-medium" htmlFor="customer-display-name">
            表示名
          </label>
          <input
            id="customer-display-name"
            name="displayName"
            type="text"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.displayName}
            onChange={handleChange("displayName")}
            required
            aria-invalid={Boolean(fieldErrors.displayName)}
            aria-describedby={fieldErrors.displayName ? "customer-display-name-error" : undefined}
          />
          {fieldErrors.displayName && (
            <p id="customer-display-name-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.displayName}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="customer-email">
            メールアドレス
          </label>
          <input
            id="customer-email"
            name="email"
            type="email"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.email}
            onChange={handleChange("email")}
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "customer-email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="customer-email-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.email}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="customer-phone">
            電話番号 (任意)
          </label>
          <input
            id="customer-phone"
            name="phone"
            type="tel"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.phone}
            onChange={handleChange("phone")}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "customer-phone-error" : undefined}
          />
          {fieldErrors.phone && (
            <p id="customer-phone-error" className="text-xs text-[color:var(--color-error-text,#991B1B)]">
              {fieldErrors.phone}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="customer-notification-email">
            通知メール (任意)
          </label>
          <input
            id="customer-notification-email"
            name="notificationEmail"
            type="email"
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
            value={form.notificationEmail}
            onChange={handleChange("notificationEmail")}
            aria-invalid={Boolean(fieldErrors.notificationEmail)}
            aria-describedby={
              fieldErrors.notificationEmail ? "customer-notification-email-error" : undefined
            }
          />
          <p className="text-xs text-[color:var(--color-text-muted)]">
            通知専用メールを設定すると、アップロード通知をこのアドレスに送付します。
          </p>
          {fieldErrors.notificationEmail && (
            <p
              id="customer-notification-email-error"
              className="text-xs text-[color:var(--color-error-text,#991B1B)]"
            >
              {fieldErrors.notificationEmail}
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
            setForm({
              displayName: profile.displayName,
              email: profile.email,
              phone: profile.phone ?? "",
              notificationEmail: profile.notificationEmail ?? "",
            });
            resetErrors();
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
