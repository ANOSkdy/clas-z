export const appNavItems = [
  { label: "ホーム", href: "/mobile" },
  { label: "アップロード", href: "/mobile/upload" },
  { label: "タスク", href: "/mobile/tasks" },
  { label: "チャット", href: "/mobile/chat" },
  { label: "プロフィール", href: "/mobile/profile" },
];

export type AppNavItem = (typeof appNavItems)[number];
