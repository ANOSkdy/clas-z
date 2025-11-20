import "./tokens.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import MobileShell from "@/components/mobile-shell";
import ClientProviders from "./(app)/providers/ClientProviders";

export const metadata: Metadata = {
  title: "CLAS-Z",
  description: "CLAS-Z プラットフォームの基盤",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full touch-manipulation antialiased">
        <ClientProviders>
          <MobileShell>{children}</MobileShell>
        </ClientProviders>
      </body>
    </html>
  );
}
