import Link from "next/link";

export default function PcHome() {
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">PCホーム（中央ペインに表示）</h1>
      <p>このセクションにメインの内容が入ります。</p>
      <p><Link className="underline" href="/pc/queue">→ キューへ</Link></p>
    </section>
  );
}