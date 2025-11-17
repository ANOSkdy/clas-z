"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LoginInviteRequest, LoginResponseSchema } from "@/lib/schemas/auth";

type LoginFormProps = {
  devEnabled: boolean;
};

type ErrorState = { message: string } | null;

type FormFields = {
  token: string;
  email: string;
};

function randomId() {
  return typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

async function postEvent(type: string, correlationId: string, payload: Record<string, unknown>) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({ type, correlationId, payload: { companyId: "public", ...payload } }),
    });
  } catch (error) {
    console.warn("[login] failed to post event", error);
  }
}

export default function LoginForm({ devEnabled }: LoginFormProps) {
  const [fields, setFields] = useState<FormFields>({ token: "", email: "" });
  const [error, setError] = useState<ErrorState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correlationId] = useState(randomId);
  const errorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const canUseToken = LoginInviteRequest.safeParse({ token: fields.token }).success;

  useEffect(() => {
    postEvent("auth.login.viewed", correlationId, {});
  }, [correlationId]);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = devEnabled && fields.email.trim().length > 0 ? { email: fields.email.trim() } : { token: fields.token.trim() };
    postEvent("auth.login.submit", correlationId, { method: "token" in payload ? "invite" : "dev" }).catch(() => undefined);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      const parsed = LoginResponseSchema.safeParse(json);

      if (!response.ok || !parsed.success || "error" in parsed.data) {
        const message = parsed.success && "error" in parsed.data ? parsed.data.error.message : "ログインに失敗しました";
        setError({ message });
        return;
      }

      await postEvent("auth.login.success", correlationId, { method: "token" in payload ? "invite" : "dev" });
      router.push("/home");
    } catch (err) {
      console.error(err);
      setError({ message: "ネットワークエラーが発生しました" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] p-4 text-sm"
        >
          <p className="font-semibold">エラーがあります</p>
          <p className="mt-1">{error.message}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="token">
          招待トークン
        </label>
        <input
          id="token"
          name="token"
          value={fields.token}
          onChange={(e) => setFields((prev) => ({ ...prev, token: e.target.value }))}
          className="w-full rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-4 py-3 text-base"
          inputMode="text"
          aria-describedby="token-help"
          required={!devEnabled}
        />
        <p id="token-help" className="text-sm text-[color:var(--color-text-muted)]">
          招待メールに記載されたコードを入力してください。
        </p>
      </div>

      {devEnabled ? (
        <details className="rounded-lg border border-[color:var(--color-border-subtle)] p-4">
          <summary className="cursor-pointer text-sm font-semibold">開発者ログイン（許可メールのみ）</summary>
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium" htmlFor="dev-email">
              メールアドレス
            </label>
            <input
              id="dev-email"
              name="dev-email"
              type="email"
              value={fields.email}
              onChange={(e) => setFields((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-4 py-3 text-base"
              inputMode="email"
              aria-describedby="dev-email-help"
            />
            <p id="dev-email-help" className="text-sm text-[color:var(--color-text-muted)]">
              AUTH_DEV_EMAILS で許可されたメールのみ利用できます。
            </p>
          </div>
        </details>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="btn btn-primary min-h-[44px] px-5"
          disabled={submitting || (!canUseToken && !(devEnabled && fields.email))}
        >
          {submitting ? "送信中..." : "ログイン"}
        </button>
        <p className="text-sm text-[color:var(--color-text-muted)]">入力後、Enter でも送信できます。</p>
      </div>
    </form>
  );
}
