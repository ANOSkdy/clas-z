import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRecord, updateRecord } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import {
  CompanyDeleteRequestSchema,
  CompanySettingsSchema,
  CompanyUpdateRequestSchema,
  type ApiError,
} from "@/lib/schemas/settings";

export const runtime = "nodejs";

const TABLE = "Companies";

type CompanyRecordFields = {
  Name?: string | null;
  LegalName?: string | null;
  BillingEmail?: string | null;
  Timezone?: string | null;
  TaxId?: string | null;
  Status?: "active" | "deleted";
  DeletedAt?: string | null;
  UpdatedAt?: string;
};

function mapCompany(record: { id: string; createdTime: string; fields: CompanyRecordFields }) {
  return CompanySettingsSchema.parse({
    id: record.id,
    name: record.fields.Name ?? "",
    legalName: record.fields.LegalName ?? undefined,
    billingEmail: record.fields.BillingEmail ?? undefined,
    timezone: record.fields.Timezone ?? undefined,
    taxId: record.fields.TaxId ?? undefined,
    status: record.fields.Status ?? "active",
    deletedAt: record.fields.DeletedAt ?? undefined,
    updatedAt: record.fields.UpdatedAt ?? record.createdTime,
  });
}

function respond<T>(correlationId: string, body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "x-correlation-id": correlationId },
  });
}

function respondError(
  correlationId: string,
  status: number,
  code: string,
  message: string,
) {
  const error: ApiError = { error: { code, message }, correlationId };
  return respond(correlationId, error, status);
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId || !auth.userId) {
      return respondError(
        correlationId,
        401,
        "AUTH_REQUIRED",
        "会社情報にアクセスするには認証が必要です",
      );
    }
    const record = await getRecord<CompanyRecordFields>(TABLE, auth.companyId);
    const company = mapCompany(record);
    return respond(correlationId, { company, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "会社情報の取得に失敗しました";
    return respondError(correlationId, 500, "COMPANY_FETCH_FAILED", message);
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId || !auth.userId) {
      return respondError(
        correlationId,
        401,
        "AUTH_REQUIRED",
        "会社情報を更新するには認証が必要です",
      );
    }
    const body = await request.json().catch(() => null);
    const parsed = CompanyUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return respondError(
        correlationId,
        400,
        "INVALID_BODY",
        parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      );
    }
    const now = new Date().toISOString();
    const result = await updateRecord<CompanyRecordFields>(TABLE, auth.companyId, {
      Name: parsed.data.name,
      LegalName: parsed.data.legalName ?? null,
      BillingEmail: parsed.data.billingEmail ?? null,
      Timezone: parsed.data.timezone ?? null,
      TaxId: parsed.data.taxId ?? null,
      UpdatedAt: now,
    });
    const company = mapCompany(result);
    await logEvent({
      type: "company.update",
      actorId: auth.userId,
      companyId: auth.companyId,
      data: { companyId: auth.companyId },
    });
    return respond(correlationId, { company, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "会社情報の更新に失敗しました";
    return respondError(correlationId, 500, "COMPANY_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.companyId || !auth.userId) {
      return respondError(
        correlationId,
        401,
        "AUTH_REQUIRED",
        "会社の削除には認証が必要です",
      );
    }
    const body = await request.json().catch(() => null);
    const parsed = CompanyDeleteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return respondError(
        correlationId,
        400,
        "INVALID_BODY",
        parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      );
    }
    const record = await getRecord<CompanyRecordFields>(TABLE, auth.companyId);
    const company = mapCompany(record);
    if (company.status === "deleted") {
      return respondError(correlationId, 409, "ALREADY_DELETED", "この会社は既に論理削除されています");
    }
    if (parsed.data.typedName.trim() !== company.name) {
      return respondError(correlationId, 400, "NAME_MISMATCH", "会社名が一致しません");
    }
    const now = new Date().toISOString();
    const updated = await updateRecord<CompanyRecordFields>(TABLE, auth.companyId, {
      Status: "deleted",
      DeletedAt: now,
      UpdatedAt: now,
    });
    const deletedCompany = mapCompany(updated);
    await logEvent({
      type: "company.delete",
      actorId: auth.userId,
      companyId: auth.companyId,
      data: { companyId: auth.companyId },
    });
    return respond(correlationId, { company: deletedCompany, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "会社の削除に失敗しました";
    return respondError(correlationId, 500, "COMPANY_DELETE_FAILED", message);
  }
}
