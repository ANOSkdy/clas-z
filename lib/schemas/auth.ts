import { z } from "zod";

export const LoginInviteRequest = z.object({
  token: z.string().min(1, "招待トークンを入力してください"),
});

export const LoginDevRequest = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export const LoginRequest = z.union([LoginInviteRequest, LoginDevRequest]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  correlationId: z.string(),
});

export const LoginResponseSchema = z.union([z.object({ ok: z.literal(true) }), ApiErrorSchema]);

export const MeResponseSchema = z.union([
  z.object({
    authenticated: z.literal(false),
    correlationId: z.string().optional(),
  }),
  z.object({
    authenticated: z.literal(true),
    userId: z.string(),
    companyId: z.string(),
    roles: z.array(z.string()).optional(),
    correlationId: z.string().optional(),
  }),
]);

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
