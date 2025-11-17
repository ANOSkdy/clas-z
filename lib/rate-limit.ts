const buckets = new Map<string, { count: number; reset: number }>();

export function checkRate({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket && bucket.reset > now) {
    bucket.count += 1;
  } else {
    buckets.set(key, { count: 1, reset: now + windowMs });
  }

  const current = buckets.get(key)!;
  const allowed = current.count <= limit;
  const remaining = Math.max(0, limit - current.count);
  return { allowed, remaining, reset: current.reset };
}
