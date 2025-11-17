export type TimingEntry = { name: string; duration: number };

export function withServerTiming<T>(label: string, run: () => Promise<T> | T): { result: Promise<T>; metric: TimingEntry } {
  const start = performance.now();
  const result = Promise.resolve(run());
  const metric: TimingEntry = { name: label, duration: 0 };
  result.finally(() => {
    metric.duration = Math.max(0, performance.now() - start);
  });
  return { result, metric };
}

export function formatServerTiming(entries: TimingEntry[]) {
  return entries
    .filter((entry) => entry.duration > 0)
    .map((entry) => `${sanitizeLabel(entry.name)};dur=${entry.duration.toFixed(1)}`)
    .join(", ");
}

function sanitizeLabel(label: string) {
  return label.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "work";
}
