import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET || 'default_secret_key_change_me';
const key = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  role: 'owner' | 'member' | 'admin';
  companyId: string;
  expiresAt: Date;
};

export async function signSession(payload: Omit<SessionPayload, 'expiresAt'>) {
  // 30分間有効
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const session = await new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
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
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await verifySession(session);
}
