import { env } from "./env";

export function buildCSP({ reportOnly = true }: { reportOnly?: boolean } = {}) {
  const directives = [
    "default-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.airtable.com https://*.blob.vercel-storage.com",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  const csp = directives.join("; ");
  const headerName = reportOnly && process.env.ENABLE_STRICT_CSP !== "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

  return { headerName, value: csp };
}

export function getAllowedOrigins() {
  const origins = [env.APP_BASE_URL];
  const extra = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  for (const origin of extra) {
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

export function applyCORS(req: Request, originHeader?: string | null) {
  const allowedOrigins = getAllowedOrigins();
  const responseHeaders = new Headers();
  responseHeaders.set("Vary", "Origin");

  const origin = originHeader && allowedOrigins.includes(originHeader) ? originHeader : undefined;
  if (origin) {
    responseHeaders.set("Access-Control-Allow-Origin", origin);
    responseHeaders.set("Access-Control-Allow-Credentials", "true");
  }

  responseHeaders.set("Access-Control-Allow-Headers", req.headers.get("access-control-request-headers") ?? "content-type, x-correlation-id");
  responseHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  const allow = req.method !== "OPTIONS" || !!origin;

  return { allow, headers: responseHeaders };
}

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function ensureCorrelationId(req: Request) {
  const generateId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString());
  return req.headers.get("x-correlation-id") ?? generateId();
}
