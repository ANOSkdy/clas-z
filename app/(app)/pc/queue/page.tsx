"use client";
import { useEffect, useState } from "react";

type Item = { id:string; fields: { title:string; status?:string; assignee?:string } };

export default function QueuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error || "failed");
        setItems(j.items);
      } catch (e:any) { setErr(String(e)); }
    })();
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">キュー一覧</h2>
      {err && <p className="text-red-700">エラー: {err}</p>}
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">タイトル</th>
              <th className="text-left p-2">ステータス</th>
              <th className="text-left p-2">担当</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.fields.title ?? "-"}</td>
                <td className="p-2">{r.fields.status ?? "-"}</td>
                <td className="p-2">{r.fields.assignee ?? "-"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-2" colSpan={3}>項目がありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}