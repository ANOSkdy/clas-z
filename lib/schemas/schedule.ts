import { z } from "zod";

export const ScheduleEventSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  status: z.enum(["scheduled", "done", "cancelled"]),
  source: z.enum(["manual", "ai", "system"]),
  icalUid: z.string(),
  lastNotifiedAt: z.string().optional(),
});

export type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

export const CreateEventRequestSchema = z.object({
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});
export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;

export const UpdateEventRequestSchema = CreateEventRequestSchema.partial().extend({
  status: z.enum(["scheduled", "done", "cancelled"]).optional(),
});
export type UpdateEventRequest = z.infer<typeof UpdateEventRequestSchema>;

export const ListEventsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(["scheduled", "done", "cancelled", "all"]).optional(),
  limit: z.coerce.number().optional(),
  cursor: z.string().optional(),
});
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;

export const SuggestScheduleRequestSchema = z.object({
  seed: z.string().optional(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
});
export type SuggestScheduleRequest = z.infer<typeof SuggestScheduleRequestSchema>;

export const ICSExportQuerySchema = z.object({
  token: z.string(),
  tz: z.string().optional(),
});
export type ICSExportQuery = z.infer<typeof ICSExportQuerySchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  correlationId: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
