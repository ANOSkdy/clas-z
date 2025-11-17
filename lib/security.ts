import "server-only";

const DEFAULT_PERMISSIONS_POLICY =
  "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()";

function parseAllowedOrigins() {
  const origins = new Set<string>();
  const appBase = process.env.APP_BASE_URL;
  if (appBase) {
    try {
      origins.add(new URL(appBase).origin);
    } catch (error) {
      console.warn("[security] invalid APP_BASE_URL", error);
    }
  }
  const extra = process.env.ALLOWED_ORIGINS;
  if (extra) {
    for (const item of extra.split(",")) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      try {
        origins.add(new URL(trimmed).origin);
      } catch (error) {
        console.warn("[security] invalid origin in ALLOWED_ORIGINS", trimmed, error);
      }
    }
  }
  return Array.from(origins);
}

export function buildCSP({ reportOnly = true }: { reportOnly?: boolean } = {}) {
  const mode = reportOnly && process.env.ENABLE_STRICT_CSP !== "1" ? "-Report-Only" : "";
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.airtable.com https://*.blob.vercel-storage.com https://blob.vercel-storage.com",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  return { header: `Content-Security-Policy${mode}`, value: directives.join("; ") };
}

export function applyCORS(req: Request, requestOrigin?: string) {
  const origin = requestOrigin ?? req.headers.get("origin") ?? undefined;
  const allowedOrigins = parseAllowedOrigins();
  const allow = origin ? allowedOrigins.includes(origin) : true;
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-correlation-id",
  };
  if (allow && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin && allowedOrigins.length > 0) {
    headers["Access-Control-Allow-Origin"] = allowedOrigins[0];
  }
  return { allow, headers };
}

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": DEFAULT_PERMISSIONS_POLICY,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};
