import { createRecord } from "./airtable";

if (typeof window !== "undefined") {
  throw new Error("lib/audit.ts はサーバー専用です");
}

type AuditEventType =
  | "customer.update"
  | "company.update"
  | "company.delete"
  | "company.restore";

export type AuditEventInput = {
  type: AuditEventType;
  actorId: string;
  companyId: string;
  data?: Record<string, unknown>;
};

export async function logEvent(input: AuditEventInput): Promise<void> {
  try {
    await createRecord("AuditLogs", {
      Type: input.type,
      ActorId: input.actorId,
      CompanyId: input.companyId,
      DataJson: input.data ? JSON.stringify(input.data) : undefined,
      CreatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}
