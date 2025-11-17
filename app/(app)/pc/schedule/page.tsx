import { randomUUID } from "crypto";
import { headers } from "next/headers";

import { env } from "@/lib/env";
import { ensureCompanyCalendarToken, listEvents } from "@/lib/schedule";
import type { ScheduleEvent } from "@/lib/schemas/schedule";

import ScheduleWorkspace from "./_components/ScheduleWorkspace";

async function loadInitialEvents(): Promise<{ events: ScheduleEvent[]; icsUrl?: string }> {
  const headerStore = await headers();
  const invite = headerStore.get("x-clas-invite");
  const correlationId = headerStore.get("x-correlation-id") ?? randomUUID();
  const req = new Request("https://example.invalid", { headers: new Headers(headerStore) });
  const { getCurrentContext } = await import("@/lib/auth");
  const auth = await getCurrentContext(req);
  try {
    const response = await fetch(`${env.APP_BASE_URL}/api/schedule`, {
      headers: {
        "x-correlation-id": correlationId,
        ...(invite ? { "x-clas-invite": invite } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return { events: [], icsUrl: undefined };
    }
    const data = await response.json();
    const events = Array.isArray(data.items) ? (data.items as ScheduleEvent[]) : [];
    const token = auth.companyId ? await ensureCompanyCalendarToken(auth.companyId) : undefined;
    const icsUrl = token ? `${env.APP_BASE_URL}/api/schedule/export.ics?token=${token}` : undefined;
    return { events, icsUrl };
  } catch (error) {
    console.error(error);
    if (auth.companyId) {
      const token = await ensureCompanyCalendarToken(auth.companyId);
      return {
        events: await listEvents(auth.companyId).then((r) => r.items).catch(() => []),
        icsUrl: `${env.APP_BASE_URL}/api/schedule/export.ics?token=${token}`,
      };
    }
    return { events: [], icsUrl: undefined };
  }
}

export default async function PcSchedulePage() {
  const { events, icsUrl } = await loadInitialEvents();

  return (
    <section className="space-y-6" aria-labelledby="schedule-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">schedule</p>
        <h1 id="schedule-heading" className="text-2xl font-semibold">
          スケジュール管理
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          イベントの一覧、編集、AI 提案、ICS 共有をひとつの画面で扱えます。
        </p>
      </header>

      <ScheduleWorkspace initialEvents={events} icsUrl={icsUrl} />
    </section>
  );
}
