import Link from "next/link";

export default function PcHome() {
  return (
    <section className="space-y-5" aria-labelledby="pc-home-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">mobile</p>
        <h1 id="pc-home-heading" className="text-2xl font-semibold">
          モバイルレビュー ハブ
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          単一カラムとタップしやすいボタンに揃え、どのページもモバイルのまま使える形にまとめています。
        </p>
      </header>
      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">これから実装される内容</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm text-[color:var(--color-text-muted)]">
          <li>OCR + Gemini による分類結果</li>
          <li>レビュータスクと Journal Entries の連動</li>
          <li>通知 / メッセージのコンテキスト表示</li>
        </ul>
      </div>
      <div className="card space-y-3" aria-label="レビュー導線">
        <p className="text-sm text-[color:var(--color-text-muted)]">最新のレビュー体験はこちらから</p>
        <Link
          href="/pc/review"
          className="btn-primary inline-flex w-full items-center justify-center text-sm"
        >
          レビュー ワークスペースへ
        </Link>
      </div>
      <div className="card space-y-3" aria-label="ホームハブ">
        <p className="text-sm text-[color:var(--color-text-muted)]">ナビゲーションをまとめたハブ</p>
        <Link href="/home" className="btn-secondary inline-flex w-full items-center justify-center text-sm">
          Home ハブへ移動
        </Link>
      </div>
      <div className="card space-y-3" aria-label="レーティング">
        <p className="text-sm text-[color:var(--color-text-muted)]">会社ごとの安全性スコアとイベントの一覧</p>
        <Link href="/pc/rating" className="btn-primary inline-flex w-full items-center justify-center text-sm">
          Rating ダッシュボードへ
        </Link>
      </div>
      <div className="card space-y-3" aria-label="試算表ワークフロー">
        <p className="text-sm text-[color:var(--color-text-muted)]">試算表の取り込みから送付までをまとめて試す</p>
        <Link
          href="/pc/trial_balance"
          className="btn-secondary inline-flex w-full items-center justify-center text-sm"
        >
          Trial Balance ワークスペースへ
        </Link>
      </div>
      <div className="card space-y-3" aria-label="プロフィール編集">
        <p className="text-sm text-[color:var(--color-text-muted)]">通知メールや表示名はここから更新できます</p>
        <Link href="/customer/edit" className="btn-secondary inline-flex w-full items-center justify-center text-sm">
          プロフィールを編集
        </Link>
      </div>
      <div className="card space-y-3" aria-label="会社設定">
        <p className="text-sm text-[color:var(--color-text-muted)]">会社情報と危険操作 (論理削除) をまとめて管理</p>
        <Link href="/settings/company" className="btn-secondary inline-flex w-full items-center justify-center text-sm">
          会社設定へ
        </Link>
      </div>
      <div className="card space-y-3" aria-label="スケジュール管理">
        <p className="text-sm text-[color:var(--color-text-muted)]">イベントの作成・編集・ICS 共有をまとめて操作</p>
        <Link href="/pc/schedule" className="btn-secondary inline-flex w-full items-center justify-center text-sm">
          スケジュールへ
        </Link>
      </div>
    </section>
  );
}
