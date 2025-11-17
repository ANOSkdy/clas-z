import { z } from "zod";

export const EventName = z.enum([
  "nav.page_view",
  "nav.header_click",
  "nav.tab_change",
  "home.quick_action_click",
  "manual.viewed",
  "manual.anchor_click",
]);

export const AnalyticsEvent = z.object({
  type: EventName,
  source: z.string().default("web"),
  correlationId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEvent>;
export type EventName = z.infer<typeof EventName>;
