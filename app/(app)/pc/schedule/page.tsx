import Link from "next/link";

export default async function SchedulePage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Schedule</h1>
      <p className="text-sm text-gray-600">スケジュール機能のプレースホルダーです。</p>
      <Link className="underline" href="/pc">戻る</Link>
    </div>
  );
}
