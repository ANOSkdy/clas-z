import crypto from "crypto";
import { trackEvent } from "./events";
import { listRecords, createRecord, updateRecord, getRecord } from "./airtable";
import type { AirtableRecord } from "./airtable";
import type { ScheduleEvent } from "./schemas/schedule";

const CALENDAR_TABLE = "CalendarEvents";
const COMPANY_TABLE = "Companies";

type CalendarRecordFields = {
  CompanyId: string;
  Title: string;
  Description?: string;
  StartsAt: string;
  EndsAt: string;
  Timezone?: string;
  Location?: string;
  Attendees?: string[];
  Status: "scheduled" | "done" | "cancelled";
  Source: "manual" | "ai" | "system";
  IcalUid: string;
  LastNotifiedAt?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type CompanyRecordFields = {
  Name?: string;
  CalendarToken?: string;
};

function mapRecord(record: AirtableRecord<CalendarRecordFields>): ScheduleEvent {
  return {
    id: record.id,
    companyId: record.fields.CompanyId,
    title: record.fields.Title,
    description: record.fields.Description,
    startsAt: record.fields.StartsAt,
    endsAt: record.fields.EndsAt,
    timezone: record.fields.Timezone,
    location: record.fields.Location,
    attendees: record.fields.Attendees,
    status: record.fields.Status,
    source: record.fields.Source,
    icalUid: record.fields.IcalUid,
    lastNotifiedAt: record.fields.LastNotifiedAt,
  };
}

export async function ensureCompanyCalendarToken(companyId: string): Promise<string> {
  const records = await listRecords<CompanyRecordFields>(COMPANY_TABLE, {
    filterByFormula: `{RecordId} = '${companyId}'`,
  });
  const record = records.records[0];
  if (record?.fields.CalendarToken) return record.fields.CalendarToken;
  const token = crypto.randomUUID().replace(/-/g, "");
  await updateRecord<CompanyRecordFields>(COMPANY_TABLE, companyId, { CalendarToken: token });
  return token;
}

export function toICS(event: ScheduleEvent): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtstart = new Date(event.startsAt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtend = new Date(event.endsAt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VEVENT",
    `UID:${event.icalUid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description}` : undefined,
    event.location ? `LOCATION:${event.location}` : undefined,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function toICSFeed(events: ScheduleEvent[], input: { companyName: string; timezone?: string }): string {
  const prodId = `-//clas-z//${input.companyName}//EN`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    ...events.flatMap((event) => toICS(event).split("\r\n")),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export async function listEvents(companyId: string, params?: { from?: string; to?: string; status?: string; limit?: number; cursor?: string }) {
  const filterParts = [`{CompanyId} = '${companyId}'`];
  if (params?.from) filterParts.push(`IS_AFTER({StartsAt}, '${params.from}')`);
  if (params?.to) filterParts.push(`IS_BEFORE({StartsAt}, '${params.to}')`);
  if (params?.status && params.status !== "all") filterParts.push(`{Status} = '${params.status}'`);
  const filterByFormula = filterParts.join(", ");
  const response = await listRecords<CalendarRecordFields>(CALENDAR_TABLE, {
    filterByFormula,
    maxRecords: params?.limit,
    offset: params?.cursor,
    sort: [{ field: "StartsAt", direction: "asc" }],
  });
  return {
    items: response.records.map(mapRecord),
    nextCursor: response.offset,
  };
}

export async function createEvent(companyId: string, input: Omit<ScheduleEvent, "id" | "companyId" | "status" | "source" | "icalUid">) {
  const record = await createRecord<CalendarRecordFields>(CALENDAR_TABLE, {
    CompanyId: companyId,
    Title: input.title,
    Description: input.description,
    StartsAt: input.startsAt,
    EndsAt: input.endsAt,
    Timezone: input.timezone,
    Location: input.location,
    Attendees: input.attendees,
    Status: "scheduled",
    Source: "manual",
    IcalUid: `${crypto.randomUUID()}@clas-z`,
    CreatedAt: new Date().toISOString(),
  });
  const mapped = mapRecord(record);
  void trackEvent({ type: "schedule.created", payload: { companyId } });
  return mapped;
}

export async function updateEvent(eventId: string, fields: Partial<CalendarRecordFields>) {
  const record = await updateRecord<CalendarRecordFields>(CALENDAR_TABLE, eventId, {
    ...fields,
    UpdatedAt: new Date().toISOString(),
  });
  return mapRecord(record);
}

export async function getEventById(eventId: string): Promise<ScheduleEvent> {
  const record = await getRecord<CalendarRecordFields>(CALENDAR_TABLE, eventId);
  return mapRecord(record);
}

export async function softDeleteEvent(eventId: string) {
  const updated = await updateRecord<CalendarRecordFields>(CALENDAR_TABLE, eventId, {
    Status: "cancelled",
    UpdatedAt: new Date().toISOString(),
  });
  void trackEvent({ type: "schedule.cancelled", payload: { eventId } });
  return mapRecord(updated);
}
