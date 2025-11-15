"use client";
import { useState } from "react";

type Step = "select" | "uploading" | "registering" | "done" | "error";

export default function MobileUpload() {
  const [file, setFile] = useState<File|null>(null);
  const [step, setStep] = useState<Step>("select");
  const [msg, setMsg]   = useState<string>("");

  async function start() {
    if (!file) return;
    try {
      setStep("uploading"); setMsg("準備中…");
      const cu = await fetch("/api/upload/create-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type || "application/octet-stream", size: file.size }),
      }).then(r => r.json());
      if (!cu.ok) throw new Error(cu.error || "create-url failed");

      setMsg("アップロード中…");
      const put = await fetch(cu.uploadUrl, { method: "PUT", body: file, headers: { "content-type": file.type || "application/octet-stream" }});
      if (!put.ok) throw new Error("upload failed: " + put.status);

      setStep("registering"); setMsg("登録中…");
      const reg = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: file.name, blobUrl: cu.blobUrl, size: file.size }),
      }).then(r => r.json());
      if (!reg.ok) throw new Error(reg.error || "register failed");

      setStep("done"); setMsg("完了しました！");
    } catch (e:any) {
      setStep("error"); setMsg(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">アップロード</h1>
      {step === "select" && (
        <div className="space-y-3">
          <input aria-label="ファイルを選択" type="file" onChange={e => setFile(e.currentTarget.files?.[0] ?? null)} />
          <button
            className="px-4 py-2 rounded bg-[var(--color-primary-plum-700)] text-white disabled:opacity-50"
            disabled={!file}
            onClick={start}
          >送信</button>
        </div>
      )}
      {step !== "select" && (
        <div role="status" aria-live="polite" className="text-sm">
          <p>{msg}</p>
          {step === "done" && <p className="text-green-700">ドキュメントを登録しました。</p>}
          {step === "error" && <p className="text-red-700">エラー: {msg}</p>}
        </div>
      )}
    </div>
  );
}