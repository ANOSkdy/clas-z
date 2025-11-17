import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "./env";
import type { UserRole } from "./schemas";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type AuthContext = {
  userId: string | null;
  companyId: string | null;
  role: UserRole | null;
  inviteToken?: string | null;
  roles?: string[] | null;
};

type SessionPayload = {
  userId: string;
  companyId: string;
  roles?: string[];
  exp: number;
  iat: number;
};

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = rest.join("=");
    return acc;
  }, {} as Record<string, string>);
}

async function signHS256(data: string): Promise<string> {
  const hmac = createHmac("sha256", env.AUTH_SECRET);
  hmac.update(data);
  return hmac.digest("base64url");
}

function isExpired(exp: number) {
  return Date.now() / 1000 > exp;
}

export async function signSession(payload: {
  userId: string;
  companyId: string;
  roles?: string[];
  exp?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp ?? now + SESSION_MAX_AGE_SECONDS;
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body: SessionPayload = {
    userId: payload.userId,
    companyId: payload.companyId,
    roles: payload.roles,
    exp,
    iat: now,
  };
  const payloadEncoded = base64url(JSON.stringify(body));
  const unsigned = `${header}.${payloadEncoded}`;
  const signature = await signHS256(unsigned);
  return `${unsigned}.${signature}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = await signHS256(`${header}.${payload}`);
  try {
    const provided = Buffer.from(signature, "base64url");
    const expected = Buffer.from(expectedSig, "base64url");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (typeof json.exp !== "number" || isExpired(json.exp)) return null;
    return json;
  } catch {
    return null;
  }
}

export async function getCurrentContext(req?: Request): Promise<AuthContext> {
  const cookieHeader = req?.headers.get("cookie") ?? cookies().getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const parsedCookies = parseCookies(cookieHeader);
  const token = parsedCookies[env.AUTH_COOKIE_NAME];
  if (!token) {
    return { userId: null, companyId: null, role: null, inviteToken: null, roles: null };
  }
  const session = await verifySession(token);
  if (!session) {
    return { userId: null, companyId: null, role: null, inviteToken: null, roles: null };
  }
  return {
    userId: session.userId,
    companyId: session.companyId,
    role: session.roles?.[0] as UserRole | null,
    inviteToken: null,
    roles: session.roles ?? null,
  };
}

export async function requireAuth(req?: Request) {
  const context = await getCurrentContext(req);
  if (!context.userId || !context.companyId) {
    redirect("/login");
  }
  return context;
}
