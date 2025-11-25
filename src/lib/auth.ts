import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET || 'default_secret_key_change_me';
const key = new TextEncoder().encode(secretKey);
const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true';

const authBypassSession = {
  userId: 'demo-user',
  role: 'admin' as const,
  companyId: process.env.AUTH_BYPASS_COMPANY_ID || 'demo-company',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

export type SessionPayload = {
  userId: string;
  role: 'owner' | 'member' | 'admin';
  companyId: string; // Added for Airtable filtering
  expiresAt: Date;
};

export async function signSession(payload: Omit<SessionPayload, 'expiresAt'>) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間有効
  const session = await new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  
  return session;
}

export async function verifySession(session: string) {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  if (AUTH_BYPASS) return authBypassSession;

  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await verifySession(session);
}

export function isAuthBypassEnabled() {
  return AUTH_BYPASS;
}

export function getBypassSession() {
  return AUTH_BYPASS ? authBypassSession : null;
}
