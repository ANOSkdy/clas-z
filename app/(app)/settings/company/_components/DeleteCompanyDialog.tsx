"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CompanyDeleteRequestSchema, CompanySettingsSchema } from "@/lib/schemas/settings";
import { useCompanySettings } from "./CompanySettingsProvider";

const SOFT_DELETE_EVENT = "clas:softDelete";

const createCorrelationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type Step = 1 | 2;

type SoftDeleteDetail = { entity: "company"; companyName: string };

export default function DeleteCompanyDialog() {
  const { company, setCompany } = useCompanySettings();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [typedName, setTypedName] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const resetDialog = () => {
    setTypedName("");
    setConfirmPhrase("");
    setAcknowledged(false);
    setError(null);
    setStep(1);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialog();
    }
  };

  const typedNameMatches = useMemo(() => {
    if (!company) return false;
    return typedName.trim() === company.name;
  }, [company, typedName]);

  const confirmPhraseValid = confirmPhrase.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!company) return;
    const payload = { typedName: typedName.trim(), confirmPhrase: "DELETE" as const };
    const parsed = CompanyDeleteRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setError("入力内容を確認してください");
      return;
    }
    try {
      setIsDeleting(true);
      const response = await fetch("/api/settings/company", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": createCorrelationId(),
        },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json?.error?.message ?? "会社の削除に失敗しました";
        throw new Error(message);
      }
      const updated = CompanySettingsSchema.safeParse(json.company ?? json);
      if (!updated.success) {
        throw new Error("会社情報の形式が不正です");
      }
      setCompany(updated.data);
      window.dispatchEvent(
        new CustomEvent<SoftDeleteDetail>(SOFT_DELETE_EVENT, {
          detail: { entity: "company", companyName: updated.data.name },
        }),
      );
      setOpen(false);
      resetDialog();
      router.push("/");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "会社の削除に失敗しました";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="card space-y-4" aria-labelledby="danger-zone-heading">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">danger</p>
        <h2 id="danger-zone-heading" className="text-xl font-semibold text-[color:#B45309]">
          Danger Zone
        </h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          会社を論理削除すると、復元するまで全メンバーのアクセスが停止します。
        </p>
      </div>
      {company?.status === "deleted" && (
        <p className="text-sm text-[color:var(--color-error-text,#991B1B)]" role="status">
          現在、この会社は論理削除状態です。復元すると再びアクセスできます。
        </p>
      )}
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={!company || company.status === "deleted"}
          >
            会社を削除
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content
            className="fixed inset-0 z-50 m-auto flex h-fit w-full max-w-lg flex-col gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-xl"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-xl font-semibold">
              {step === 1 ? "会社名を確認" : "削除の最終確認"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[color:var(--color-text-muted)]">
              {step === 1
                ? `「${company?.name ?? ""}」と入力して操作を続行します。`
                : "DELETE と入力し、論理削除の影響を理解したことを確認してください。"}
            </Dialog.Description>
            {error && (
              <p className="rounded-md border border-[color:var(--color-error-border,#FCA5A5)] bg-[color:var(--color-error-bg,#FEF2F2)] p-3 text-sm text-[color:var(--color-error-text,#991B1B)]" role="alert">
                {error}
              </p>
            )}
            {step === 1 ? (
              <div className="space-y-3">
                <label className="text-sm font-medium" htmlFor="danger-company-name">
                  会社名
                </label>
                <input
                  id="danger-company-name"
                  type="text"
                  className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  placeholder={company?.name ?? ""}
                  aria-invalid={!typedNameMatches && Boolean(typedName)}
                />
                <p className="text-xs text-[color:var(--color-text-muted)]">
                  この操作は論理削除です。入力内容が完全一致した場合のみ次へ進めます。
                </p>
                <div className="flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button type="button" className="btn-secondary text-sm">
                      キャンセル
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={!typedNameMatches}
                    onClick={() => {
                      setError(null);
                      setStep(2);
                    }}
                  >
                    続ける
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="space-y-2 text-sm font-medium" htmlFor="danger-confirm-phrase">
                  確認ワード (DELETE)
                  <input
                    id="danger-confirm-phrase"
                    type="text"
                    className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-3 py-2"
                    value={confirmPhrase}
                    onChange={(event) => setConfirmPhrase(event.target.value)}
                    aria-invalid={!confirmPhraseValid && Boolean(confirmPhrase)}
                  />
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  <span>
                    論理削除後は復元 API を呼び出すまでアクセスが停止することを理解しました。
                  </span>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button type="button" className="text-sm underline" onClick={() => setStep(1)}>
                    ← 戻る
                  </button>
                  <div className="flex gap-3">
                    <Dialog.Close asChild>
                      <button type="button" className="btn-secondary text-sm" disabled={isDeleting}>
                        キャンセル
                      </button>
                    </Dialog.Close>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={handleDelete}
                      disabled={!confirmPhraseValid || !acknowledged || isDeleting}
                    >
                      {isDeleting ? "削除中..." : "論理削除を実行"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
