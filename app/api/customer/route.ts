import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRecord, updateRecord } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import {
  CustomerProfileSchema,
  CustomerUpdateRequestSchema,
  type ApiError,
} from "@/lib/schemas/settings";

export const runtime = "node";

type CustomerRecordFields = {
  DisplayName?: string;
  Email?: string;
  Phone?: string | null;
  NotificationEmail?: string | null;
  AvatarUrl?: string;
  UpdatedAt?: string;
  CompanyId?: string;
};

function mapCustomer(record: { id: string; createdTime: string; fields: CustomerRecordFields }) {
  const profile = CustomerProfileSchema.parse({
    id: record.id,
    displayName: record.fields.DisplayName ?? "",
    email: record.fields.Email ?? "",
    phone: record.fields.Phone ?? undefined,
    notificationEmail: record.fields.NotificationEmail ?? undefined,
    avatarUrl: record.fields.AvatarUrl ?? undefined,
    updatedAt: record.fields.UpdatedAt ?? record.createdTime,
  });
  return profile;
}

function jsonResponse<T>(params: {
  correlationId: string;
  status?: number;
  body: T;
}) {
  return NextResponse.json(params.body, {
    status: params.status ?? 200,
    headers: { "x-correlation-id": params.correlationId },
  });
}

function errorResponse(params: { correlationId: string; status: number; code: string; message: string }) {
  const body: ApiError = {
    error: { code: params.code, message: params.message },
    correlationId: params.correlationId,
  };
  return jsonResponse({ correlationId: params.correlationId, status: params.status, body });
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.userId || !auth.companyId) {
      return errorResponse({
        correlationId,
        status: 401,
        code: "AUTH_REQUIRED",
        message: "プロフィール情報にアクセスするには認証が必要です",
      });
    }
    const record = await getRecord<CustomerRecordFields>("Customers", auth.userId);
    const customer = mapCustomer(record);
    return jsonResponse({ correlationId, body: { customer, correlationId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "プロフィールの取得に失敗しました";
    return errorResponse({ correlationId, status: 500, code: "CUSTOMER_FETCH_FAILED", message });
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const auth = await getCurrentContext(request);
    if (!auth.userId || !auth.companyId) {
      return errorResponse({
        correlationId,
        status: 401,
        code: "AUTH_REQUIRED",
        message: "プロフィールを更新するには認証が必要です",
      });
    }
    const body = await request.json().catch(() => null);
    const parsed = CustomerUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse({
        correlationId,
        status: 400,
        code: "INVALID_BODY",
        message: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      });
    }
    const now = new Date().toISOString();
    const updated = await updateRecord<CustomerRecordFields>("Customers", auth.userId, {
      DisplayName: parsed.data.displayName,
      Email: parsed.data.email,
      Phone: parsed.data.phone ?? null,
      NotificationEmail: parsed.data.notificationEmail ?? null,
      UpdatedAt: now,
    });
    const customer = mapCustomer(updated);
    await logEvent({
      type: "customer.update",
      actorId: auth.userId,
      companyId: auth.companyId,
      data: { customerId: auth.userId },
    });
    return jsonResponse({ correlationId, body: { customer, correlationId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "プロフィールの更新に失敗しました";
    return errorResponse({ correlationId, status: 500, code: "CUSTOMER_UPDATE_FAILED", message });
  }
}
