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
  title: z.string().trim().min(1, "タイトルは必須です"),
  startsAt: z.string(),
  endsAt: z.string(),
  description: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  attendees: z.array(z.string().trim()).optional(),
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
  limit: z.coerce.number().min(1).max(200).optional(),
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
  token: z.string().min(1, "token is required"),
  tz: z.string().optional(),
});

export type ICSExportQuery = z.infer<typeof ICSExportQuerySchema>;

export type ApiError = { error: { code: string; message: string }; correlationId: string };
