import type { UserRole } from "./schemas";

export type AuthContext = {
  userId: string | null;
  companyId: string | null;
  role: UserRole | null;
  inviteToken: string | null;
};

export async function getCurrentContext(req: Request): Promise<AuthContext> {
  const inviteToken = req.headers.get("x-clas-invite") ?? null;
  if (!inviteToken) {
    return {
      userId: null,
      companyId: null,
      role: null,
      inviteToken: null,
    };
  }

  return {
    userId: `user_${inviteToken.slice(0, 8)}`,
    companyId: `company_${inviteToken.slice(-8)}`,
    role: "uploader",
    inviteToken,
  };
}
