import { z } from "zod";

export const EventName = z.enum([
  "nav.page_view",
  "nav.header_click",
  "nav.tab_change",
  "home.quick_action_click",
  "manual.viewed",
  "manual.anchor_click",
]);

const BaseEvent = {
  source: z.string().default("web"),
  correlationId: z.string().uuid().optional(),
};

export const AnalyticsEvent = z.discriminatedUnion("type", [
  z.object({
    type: EventName,
    payload: z.record(z.string(), z.any()).optional(),
    ...BaseEvent,
  }),
  z.object({
    type: z.literal("perf.vitals"),
    payload: z
      .object({
        name: z.string(),
        value: z.number(),
        rating: z.string().optional(),
        path: z.string().optional(),
        id: z.string().optional(),
      })
      .passthrough(),
    ...BaseEvent,
  }),
]);

export type AnalyticsEvent = z.infer<typeof AnalyticsEvent>;
export type EventName = z.infer<typeof EventName>;
