export async function withServerTiming<T>(
  headers: Headers,
  label: string,
  cb: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  const result = await cb();
  const duration = Math.max(0, performance.now() - start).toFixed(1);
  const existing = headers.get("Server-Timing");
  headers.set("Server-Timing", existing ? `${existing}, ${label};dur=${duration}` : `${label};dur=${duration}`);
  return result;
}
