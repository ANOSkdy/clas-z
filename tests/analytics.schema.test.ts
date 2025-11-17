import { describe, expect, it } from "vitest";

import { AnalyticsEvent, EventName } from "@/lib/schemas/analytics";

describe("AnalyticsEvent schema", () => {
  it("accepts known event names and auto-fills source", () => {
    const parsed = AnalyticsEvent.parse({
      type: "nav.page_view",
      payload: { path: "/home" },
    });
    expect(parsed.type).toBe(EventName.enum["nav.page_view"]);
    expect(parsed.source).toBe("web");
  });

  it("rejects unknown event names", () => {
    expect(() =>
      AnalyticsEvent.parse({
        type: "unknown.event",
        source: "web",
      }),
    ).toThrow();
  });

  it("enforces UUID correlationId when provided", () => {
    const id = crypto.randomUUID();
    expect(AnalyticsEvent.parse({ type: "manual.viewed", correlationId: id }).correlationId).toBe(id);
    expect(() => AnalyticsEvent.parse({ type: "manual.viewed", correlationId: "not-uuid" })).toThrow();
  });
});
