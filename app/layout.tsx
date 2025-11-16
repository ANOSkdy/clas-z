import "./tokens.css";
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "CLAS-Z",
  description: "CLAS-Z プラットフォームの基盤",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a href="#main" className="skip-link">
          メインコンテンツへスキップ
        </a>
        <div className="app-shell">
          <header className="shell-header" role="banner">
            <div>
              <Link href="/" className="font-semibold tracking-wide">
                CLAS-Z
              </Link>
              <p className="text-sm text-[color:var(--color-text-muted)]">会計書類の安心ルート</p>
            </div>
            <nav aria-label="グローバルナビ" className="flex items-center gap-4 text-sm">
              <Link href="/mobile" className="underline-offset-4 hover:underline">
                モバイル
              </Link>
              <Link href="/pc" className="underline-offset-4 hover:underline">
                PC レビュー
              </Link>
              <Link href="/health" className="underline-offset-4 hover:underline">
                ヘルスチェック
              </Link>
            </nav>
          </header>
          <Providers>
            <div className="shell-main">{children}</div>
          </Providers>
          <footer className="shell-footer" role="contentinfo">
            <span>© {new Date().getFullYear()} CLAS-Z</span>
            <div className="flex gap-4 text-sm">
              <a href="mailto:support@clas-z.example" className="underline-offset-4 hover:underline">
                サポート
              </a>
              <a href="/privacy" className="underline-offset-4 hover:underline">
                プライバシー
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
