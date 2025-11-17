import "./tokens.css";
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";

import AppHeader from "./_components/AppHeader";
import ClientProviders from "./(app)/providers/ClientProviders";

export const metadata: Metadata = {
  title: "CLAS-Z",
  description: "CLAS-Z プラットフォームの基盤",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="app-shell">
          <AppHeader />
          <ClientProviders>
            <main id="main" className="shell-main">
              {children}
            </main>
          </ClientProviders>
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
