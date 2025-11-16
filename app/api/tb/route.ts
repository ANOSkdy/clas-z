import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { CreateTBRequestSchema, ApiError } from "@/lib/schemas/tb";
import { getCurrentContext } from "@/lib/auth";
import {
  createTrialBalanceRecord,
  listTrialBalanceRecords,
  mapTrialBalanceRecord,
} from "@/lib/tb-store";

export const runtime = "nodejs";

const ListQuerySchema = z.object({
  companyId: z.string().optional(),
  limit: z
    .string()
    .transform((value) => Number(value))
    .pipe(z.number().min(1).max(50))
    .optional(),
  cursor: z.string().optional(),
});

type ListQuery = z.infer<typeof ListQuerySchema>;

function withCorrelation<T>(correlationId: string, data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ...data, correlationId },
    { ...init, headers: { "x-correlation-id": correlationId, ...(init?.headers || {}) } },
  );
}

function errorResponse(correlationId: string, message: string, status = 400, code = "BAD_REQUEST") {
  const payload: ApiError = { error: { code, message }, correlationId };
  return withCorrelation(correlationId, payload, { status });
}

export async function POST(req: NextRequest) {
  const correlationId = randomUUID();
  try {
    const body = await req.json();
    const input = CreateTBRequestSchema.parse(body);
    const context = await getCurrentContext(req);
    const companyId = input.companyId ?? context.companyId;
    if (!companyId) {
      return errorResponse(correlationId, "companyId を特定できません", 400);
    }

    const record = await createTrialBalanceRecord({
      CompanyId: companyId,
      PeriodStart: input.periodStart,
      PeriodEnd: input.periodEnd,
      Currency: input.currency ?? "JPY",
      Status: "draft",
      Source: input.source,
      Meta: input.meta ? JSON.stringify(input.meta) : undefined,
    });

    return withCorrelation(correlationId, { tbId: record.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "入力が不正です";
      return errorResponse(correlationId, message, 400);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(correlationId, message, 500, "INTERNAL_ERROR");
  }
}

export async function GET(req: NextRequest) {
  const correlationId = randomUUID();
  try {
    const queryInput = Object.fromEntries(new URL(req.url).searchParams.entries());
    let query: ListQuery | null = null;
    if (Object.keys(queryInput).length) {
      query = ListQuerySchema.parse(queryInput);
    }
    const context = await getCurrentContext(req);
    const companyId = query?.companyId ?? context.companyId ?? undefined;
    const response = await listTrialBalanceRecords({
      companyId,
      limit: query?.limit,
      cursor: query?.cursor,
    });

    return withCorrelation(
      correlationId,
      {
        items: response.records.map(mapTrialBalanceRecord),
        nextCursor: response.offset,
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "クエリが不正です";
      return errorResponse(correlationId, message, 400);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(correlationId, message, 500, "INTERNAL_ERROR");
  }
}
