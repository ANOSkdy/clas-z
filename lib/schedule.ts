import "server-only";

import { randomUUID } from "crypto";

import {
  createRecord,
  getRecord,
  listRecords,
  updateRecord,
  type AirtableRecord,
} from "./airtable";
import { trackEvent } from "./events";
import {
  type CreateEventRequest,
  type ListEventsQuery,
  type ScheduleEvent,
  type UpdateEventRequest,
} from "./schemas/schedule";

const CALENDAR_TABLE = "CalendarEvents";
const COMPANY_TABLE = "Companies";

type CalendarRecordFields = {
  CompanyId: string;
  Title: string;
  Description?: string | null;
  StartsAt: string;
  EndsAt: string;
  Timezone?: string | null;
  Location?: string | null;
  Attendees?: string[] | null;
  Status?: "scheduled" | "done" | "cancelled";
  Source?: "manual" | "ai" | "system";
  IcalUid?: string;
  LastNotifiedAt?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type CompanyRecordFields = {
  Name?: string | null;
  CalendarToken?: string | null;
  Timezone?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function toEvent(record: AirtableRecord<CalendarRecordFields>): ScheduleEvent {
  return {
    id: record.id,
    companyId: record.fields.CompanyId,
    title: record.fields.Title,
    description: record.fields.Description ?? undefined,
    startsAt: record.fields.StartsAt,
    endsAt: record.fields.EndsAt,
    timezone: record.fields.Timezone ?? undefined,
    location: record.fields.Location ?? undefined,
    attendees: record.fields.Attendees ?? undefined,
    status: record.fields.Status ?? "scheduled",
    source: record.fields.Source ?? "manual",
    icalUid: record.fields.IcalUid ?? `${record.id}@clas-z`,
    lastNotifiedAt: record.fields.LastNotifiedAt ?? undefined,
  };
}

function buildDateRangeFilter(from?: string, to?: string) {
  const clauses: string[] = [];
  if (from) {
    clauses.push(`IS_AFTER({EndsAt}, '${from}')`);
  }
  if (to) {
    clauses.push(`IS_BEFORE({StartsAt}, '${to}')`);
  }
  return clauses.length ? `AND(${clauses.join(",")})` : "";
}

function buildStatusFilter(status?: string) {
  if (!status || status === "all") return "";
  return `{Status}='${status}'`;
}

function combineFilters(filters: string[]) {
  const available = filters.filter(Boolean);
  if (!available.length) return undefined;
  if (available.length === 1) return available[0];
  return `AND(${available.join(",")})`;
}

export async function listEvents(
  companyId: string,
  query: ListEventsQuery = {},
): Promise<{ items: ScheduleEvent[]; nextCursor?: string }> {
  const filter = combineFilters([
    `{CompanyId}='${companyId}'`,
    buildDateRangeFilter(query.from, query.to),
    buildStatusFilter(query.status),
  ]);
  const response = await listRecords<CalendarRecordFields>(
    CALENDAR_TABLE,
    {
      filterByFormula: filter,
      pageSize: query.limit ?? 50,
      offset: query.cursor,
      sort: [{ field: "StartsAt", direction: "asc" }],
    },
    { maxRetries: 3 },
  );

  return {
    items: response.records.map(toEvent),
    nextCursor: response.offset,
  };
}

export async function getEventById(eventId: string): Promise<ScheduleEvent> {
  const record = await getRecord<CalendarRecordFields>(CALENDAR_TABLE, eventId);
  return toEvent(record);
}

export async function createEvent(
  companyId: string,
  input: CreateEventRequest & { status?: "scheduled" | "done" | "cancelled"; source?: "manual" | "ai" | "system" },
): Promise<{ id: string; icalUid: string }> {
  const now = nowIso();
  const icalUid = `${randomUUID()}@clas-z`;
  const record = await createRecord<CalendarRecordFields>(
    CALENDAR_TABLE,
    {
      CompanyId: companyId,
      Title: input.title,
      Description: input.description ?? null,
      StartsAt: input.startsAt,
      EndsAt: input.endsAt,
      Timezone: input.timezone ?? null,
      Location: input.location ?? null,
      Attendees: input.attendees ?? null,
      Status: input.status ?? "scheduled",
      Source: input.source ?? "manual",
      IcalUid: icalUid,
      CreatedAt: now,
      UpdatedAt: now,
    },
    { maxRetries: 3 },
  );
  return { id: record.id, icalUid };
}

export async function updateEvent(
  eventId: string,
  patch: UpdateEventRequest,
): Promise<ScheduleEvent> {
  const now = nowIso();
  const updated = await updateRecord<CalendarRecordFields>(
    CALENDAR_TABLE,
    eventId,
    {
      Title: patch.title ?? undefined,
      Description: patch.description ?? null,
      StartsAt: patch.startsAt ?? undefined,
      EndsAt: patch.endsAt ?? undefined,
      Timezone: patch.timezone ?? null,
      Location: patch.location ?? null,
      Attendees: patch.attendees ?? null,
      Status: patch.status ?? undefined,
      UpdatedAt: now,
    },
    { maxRetries: 3 },
  );
  return toEvent(updated);
}

export async function softDeleteEvent(eventId: string): Promise<ScheduleEvent> {
  const updated = await updateRecord<CalendarRecordFields>(
    CALENDAR_TABLE,
    eventId,
    { Status: "cancelled", UpdatedAt: nowIso() },
    { maxRetries: 3 },
  );
  return toEvent(updated);
}

export async function ensureCompanyCalendarToken(companyId: string): Promise<string> {
  const company = await getRecord<CompanyRecordFields>(COMPANY_TABLE, companyId);
  if (company.fields.CalendarToken) return company.fields.CalendarToken;
  const token = randomUUID();
  await updateRecord<CompanyRecordFields>(COMPANY_TABLE, companyId, { CalendarToken: token });
  return token;
}

export function toICS(event: ScheduleEvent, opts: { prodId?: string } = {}): string {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtStart = new Date(event.startsAt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtEnd = new Date(event.endsAt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.icalUid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
  ];
  if (opts.prodId) lines.splice(1, 0, `X-PRODID:${opts.prodId}`);
  if (event.description) lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
  if (event.location) lines.push(`LOCATION:${event.location}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function toICSFeed(events: ScheduleEvent[], input: { companyName: string; timezone?: string }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//clas-z//schedule//${input.companyName}//JP`,
    input.timezone ? `X-WR-TIMEZONE:${input.timezone}` : undefined,
    ...events.flatMap((event) => toICS(event).split("\r\n")),
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export async function findCompanyByToken(token: string): Promise<{ id: string; name: string; timezone?: string } | null> {
  const response = await listRecords<CompanyRecordFields>(COMPANY_TABLE, {
    filterByFormula: `{CalendarToken}='${token}'`,
    maxRecords: 1,
  });
  const record = response.records[0];
  if (!record) return null;
  return { id: record.id, name: record.fields.Name ?? "", timezone: record.fields.Timezone ?? undefined };
}

export async function markNotified(eventId: string): Promise<void> {
  await updateRecord<CalendarRecordFields>(CALENDAR_TABLE, eventId, {
    LastNotifiedAt: nowIso(),
  });
}

export async function recordNotification(
  companyId: string,
  event: ScheduleEvent,
  correlationId: string,
): Promise<void> {
  await trackEvent({
    companyId,
    type: "schedule.notify.sent",
    source: "system",
    correlationId,
    payload: { eventId: event.id, startsAt: event.startsAt },
  });
}

export async function trackScheduleAction(
  companyId: string,
  type: string,
  correlationId: string,
  payload?: Record<string, unknown>,
) {
  await trackEvent({
    companyId,
    type,
    source: "schedule",
    correlationId,
    payload,
  });
}
