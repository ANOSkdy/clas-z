import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Providers from "./providers";

const font = Noto_Sans_JP({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CLAS-Z",
  description: "App shell",
};

export default function RootLayout({ children }:{ children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={font.className}>
        <a href="#main" className="sr-only focus:not-sr-only">メインへスキップ</a>
        <header className="h-12 border-b flex items-center justify-between px-4">
          <strong className="tracking-wide">CLAS-Z</strong>
          <nav className="flex gap-4 text-sm">
            <a className="underline" href="/help">ヘルプ</a>
            <a className="underline" href="/notifications">通知</a>
          </nav>
        </header>
        <Providers>
          <div id="main">{children}</div>
        </Providers>
      </body>
    </html>
  );
}