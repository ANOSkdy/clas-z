"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Search, Sparkles, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-50 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[64px] min-w-[44px] flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors ${
                active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
