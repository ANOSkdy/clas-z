import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "CLAS-Z",
  description: "Tax & Labor Support System",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
