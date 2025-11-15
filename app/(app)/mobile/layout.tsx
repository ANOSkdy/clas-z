export default function MobileLayout({ children }:{ children: React.ReactNode }) {
  return (
    <div className="h-[calc(100svh-48px)] grid grid-rows-[1fr_56px] relative">
      <main id="main" className="p-4">{children}</main>

      <nav aria-label="メイン" className="border-t grid grid-cols-5 text-center">
        <a className="py-2" href="/mobile">ホーム</a>
        <a className="py-2" href="/mobile/upload">アップロード</a>
        <a className="py-2" href="/mobile/tasks">タスク</a>
        <a className="py-2" href="/mobile/chat">チャット</a>
        <a className="py-2" href="/mobile/profile">プロフィール</a>
      </nav>

      <a
        href="/mobile/upload"
        className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center
                   bg-[var(--color-primary-plum-700)] text-white shadow"
        aria-label="+ アップロード">
        +
      </a>
    </div>
  );
}