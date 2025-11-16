import "server-only";

import { randomUUID } from "crypto";

import { createRecord } from "./airtable";

const EVENTS_TABLE = "AnalyticsEvents";

type AnalyticsEventFields = {
  CompanyId: string;
  UserId?: string | null;
  Type: string;
  Source: string;
  CorrelationId?: string;
  PayloadJson?: string;
  CreatedAt?: string;
};

type TrackEventInput = {
  companyId: string;
  userId?: string;
  type: string;
  source: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
};

export async function trackEvent(input: TrackEventInput): Promise<void> {
  const payload: AnalyticsEventFields = {
    CompanyId: input.companyId,
    UserId: input.userId ?? null,
    Type: input.type,
    Source: input.source,
    CorrelationId: input.correlationId ?? randomUUID(),
    PayloadJson: input.payload ? JSON.stringify(input.payload) : undefined,
    CreatedAt: new Date().toISOString(),
  };

  try {
    await createRecord<AnalyticsEventFields>(EVENTS_TABLE, payload);
  } catch (error) {
    console.warn("[events] failed to track event", input.type, error);
  }
}
