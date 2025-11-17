import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createRecord, getRecords, updateRecord } from "@/lib/airtable";
import { signSession } from "@/lib/auth";
import { trackEvent } from "@/lib/events";
import { LoginInviteRequest, LoginRequest } from "@/lib/schemas/auth";
import { ensureCorrelationId, securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

const INVITES_TABLE = "Invites";
const USERS_TABLE = "Users";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type InviteFields = {
  Token: string;
  Email: string;
  CompanyId: string;
  UserId?: string;
  ExpiresAt?: string;
  Used?: boolean;
};

type UserFields = {
  Id?: string;
  Email: string;
  DisplayName?: string;
  CompanyId: string;
  Roles?: string[];
};

function escapeFormulaValue(value: string) {
  return value.replace(/'/g, "\\'");
}

function parseDevEmails() {
  return env.AUTH_DEV_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) ?? [];
}

function buildErrorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string,
  headers: Headers,
) {
  const merged = new Headers(headers);
  merged.set("x-correlation-id", correlationId);
  for (const [key, value] of Object.entries(securityHeaders)) {
    merged.set(key, value);
  }
  return NextResponse.json({ error: { code, message }, correlationId }, { status, headers: merged });
}

async function findInviteByToken(token: string) {
  const records = await getRecords<InviteFields>(
    INVITES_TABLE,
    {
      filterByFormula: `LOWER({Token}) = '${escapeFormulaValue(token.toLowerCase())}'`,
      maxRecords: 1,
    },
    { maxRetries: 2 },
  );
  return records[0];
}

async function findUserByEmail(email: string) {
  const records = await getRecords<UserFields>(
    USERS_TABLE,
    {
      filterByFormula: `LOWER({Email}) = '${escapeFormulaValue(email.toLowerCase())}'`,
      maxRecords: 1,
    },
    { maxRetries: 2 },
  );
  return records[0];
}

async function createUser(fields: Pick<UserFields, "Email" | "CompanyId"> & Partial<UserFields>) {
  const record = await createRecord<UserFields>(USERS_TABLE, {
    Email: fields.Email,
    CompanyId: fields.CompanyId,
    DisplayName: fields.DisplayName,
    Roles: fields.Roles ?? ["uploader"],
    Id: fields.Id,
  });
  return record;
}

async function markInviteUsed(inviteId: string, userId?: string) {
  try {
    await updateRecord<InviteFields>(INVITES_TABLE, inviteId, { Used: true, UserId: userId });
  } catch (error) {
    console.warn("[auth] failed to mark invite used", error);
  }
}

async function emitAuthEvent(type: "auth.login.success" | "auth.login.failure", payload: Record<string, unknown>) {
  try {
    await trackEvent({
      companyId: String(payload.companyId ?? "unknown"),
      userId: typeof payload.userId === "string" ? payload.userId : undefined,
      type,
      source: "web",
      correlationId: typeof payload.correlationId === "string" ? payload.correlationId : undefined,
      payload,
    });
  } catch (error) {
    console.warn(`[auth] failed to emit event ${type}`, error);
  }
}

function buildSessionCookie(token: string) {
  const secure = env.NODE_ENV !== "development";
  const parts = [
    `${env.AUTH_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(req: Request) {
  const correlationId = ensureCorrelationId(req);
  const baseHeaders = new Headers({ "x-correlation-id": correlationId });
  for (const [key, value] of Object.entries(securityHeaders)) {
    baseHeaders.set(key, value);
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return buildErrorResponse(400, "BAD_REQUEST", "JSON body is required", correlationId, baseHeaders);
  }

  const parsed = LoginRequest.safeParse(body);
  if (!parsed.success) {
    return buildErrorResponse(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid payload", correlationId, baseHeaders);
  }

  try {
    const isDev = "email" in parsed.data;
    if (isDev) {
      if (env.NODE_ENV === "production") {
        return buildErrorResponse(401, "UNAUTHORIZED", "Developer login is disabled", correlationId, baseHeaders);
      }
      if (!parseDevEmails().includes(parsed.data.email.toLowerCase())) {
        return buildErrorResponse(401, "UNAUTHORIZED", "Email not allowed for developer login", correlationId, baseHeaders);
      }

      const existing = await findUserByEmail(parsed.data.email);
      const userRecord =
        existing ??
        (await createUser({
          Email: parsed.data.email,
          CompanyId: "dev-company",
          DisplayName: parsed.data.email.split("@")[0],
          Roles: ["admin"],
        }));

      const session = await signSession({
        userId: userRecord.fields.Id ?? userRecord.id,
        companyId: userRecord.fields.CompanyId,
        roles: userRecord.fields.Roles ?? ["admin"],
      });

      baseHeaders.set("Set-Cookie", buildSessionCookie(session));
      await emitAuthEvent("auth.login.success", {
        correlationId,
        companyId: userRecord.fields.CompanyId,
        userId: userRecord.fields.Id ?? userRecord.id,
        method: "dev",
        email: parsed.data.email,
      });

      return NextResponse.json({ ok: true, correlationId }, { headers: baseHeaders });
    }

    const inviteReq = LoginInviteRequest.parse(parsed.data);
    const invite = await findInviteByToken(inviteReq.token);
    if (!invite) {
      await emitAuthEvent("auth.login.failure", { correlationId, reason: "INVITE_NOT_FOUND" });
      return buildErrorResponse(401, "INVALID_TOKEN", "招待トークンが見つかりません", correlationId, baseHeaders);
    }

    if (invite.fields.Used) {
      await emitAuthEvent("auth.login.failure", {
        correlationId,
        reason: "INVITE_USED",
        companyId: invite.fields.CompanyId,
      });
      return buildErrorResponse(400, "INVITE_USED", "この招待はすでに使用されています", correlationId, baseHeaders);
    }

    if (invite.fields.ExpiresAt) {
      const expires = new Date(invite.fields.ExpiresAt);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
        await emitAuthEvent("auth.login.failure", {
          correlationId,
          reason: "INVITE_EXPIRED",
          companyId: invite.fields.CompanyId,
        });
        return buildErrorResponse(401, "INVITE_EXPIRED", "招待の有効期限が切れています", correlationId, baseHeaders);
      }
    }

    let userId = invite.fields.UserId;
    let userRecord = userId ? await findUserByEmail(invite.fields.Email) : null;
    if (!userRecord) {
      userRecord = await createUser({ Email: invite.fields.Email, CompanyId: invite.fields.CompanyId, Roles: ["uploader"] });
      userId = userRecord.fields.Id ?? userRecord.id;
    } else {
      userId = userId ?? userRecord.fields.Id ?? userRecord.id;
    }

    await markInviteUsed(invite.id, userId);

    const session = await signSession({
      userId: userId!,
      companyId: invite.fields.CompanyId,
      roles: userRecord?.fields.Roles,
    });
    baseHeaders.set("Set-Cookie", buildSessionCookie(session));

    await emitAuthEvent("auth.login.success", {
      correlationId,
      companyId: invite.fields.CompanyId,
      userId,
      method: "invite",
    });

    return NextResponse.json({ ok: true, correlationId }, { headers: baseHeaders });
  } catch (error) {
    console.error("[auth] login failed", error);
    await emitAuthEvent("auth.login.failure", { correlationId, reason: "INTERNAL_ERROR" });
    return buildErrorResponse(500, "INTERNAL_ERROR", "ログイン処理に失敗しました", correlationId, baseHeaders);
  }
}
