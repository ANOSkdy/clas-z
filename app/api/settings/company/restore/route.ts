import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRecord, updateRecord } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import {
  CompanyRestoreRequestSchema,
  CompanySettingsSchema,
  type ApiError,
} from "@/lib/schemas/settings";

export const runtime = "node";

type CompanyRecordFields = {
  Name?: string;
  LegalName?: string;
  BillingEmail?: string;
  Timezone?: string;
  TaxId?: string;
  Status?: "active" | "deleted";
  DeletedAt?: string | null;
  UpdatedAt?: string;
};

function respond<T>(correlationId: string, body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "x-correlation-id": correlationId },
  });
}

function respondError(correlationId: string, status: number, code: string, message: string) {
  const error: ApiError = { error: { code, message }, correlationId };
  return respond(correlationId, error, status);
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId || !auth.userId) {
      return respondError(correlationId, 401, "AUTH_REQUIRED", "復元するには認証が必要です");
    }
    const body = await request
      .json()
      .catch(() => ({}));
    const parsed = CompanyRestoreRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return respondError(correlationId, 400, "INVALID_BODY", "入力内容を確認してください");
    }
    const record = await getRecord<CompanyRecordFields>("Companies", auth.companyId);
    const now = new Date().toISOString();
    const updated = await updateRecord<CompanyRecordFields>("Companies", auth.companyId, {
      Status: "active",
      DeletedAt: null,
      UpdatedAt: now,
    });
    const company = CompanySettingsSchema.parse({
      id: updated.id,
      name: updated.fields.Name ?? "",
      legalName: updated.fields.LegalName ?? undefined,
      billingEmail: updated.fields.BillingEmail ?? undefined,
      timezone: updated.fields.Timezone ?? undefined,
      taxId: updated.fields.TaxId ?? undefined,
      status: updated.fields.Status ?? "active",
      deletedAt: updated.fields.DeletedAt ?? undefined,
      updatedAt: updated.fields.UpdatedAt ?? record.createdTime,
    });
    await logEvent({
      type: "company.restore",
      actorId: auth.userId,
      companyId: auth.companyId,
      data: { companyId: auth.companyId },
    });
    return respond(correlationId, { ok: true, company, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "会社の復元に失敗しました";
    return respondError(correlationId, 500, "COMPANY_RESTORE_FAILED", message);
  }
}
