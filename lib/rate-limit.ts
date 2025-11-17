const buckets = new Map<string, { count: number; reset: number }>();

export type RateLimitResult = { allowed: boolean; remaining: number; reset: number };

export function checkRate({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket && now < bucket.reset) {
    if (bucket.count >= limit) {
      return { allowed: false, remaining: 0, reset: bucket.reset };
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    return { allowed: true, remaining: limit - bucket.count, reset: bucket.reset };
  }

  const reset = now + windowMs;
  buckets.set(key, { count: 1, reset });
  return { allowed: true, remaining: limit - 1, reset };
}

export function getRetryAfter(reset: number) {
  return Math.max(0, Math.ceil((reset - Date.now()) / 1000));
}
