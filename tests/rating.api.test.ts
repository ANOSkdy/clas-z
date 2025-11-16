import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTrackEvent = vi.fn().mockResolvedValue(undefined);
const mockGetRecord = vi.fn();
const mockListRecords = vi.fn();
const mockCreateRecord = vi.fn().mockResolvedValue({ id: "rec", createdTime: new Date().toISOString(), fields: {} });
const mockUpdateRecord = vi.fn().mockResolvedValue({ id: "rec", createdTime: new Date().toISOString(), fields: {} });

vi.mock("../lib/events", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

vi.mock("../lib/auth", () => ({
  getCurrentContext: vi.fn().mockResolvedValue({ companyId: "comp-test", userId: "user-test", role: "owner", inviteToken: null }),
}));

vi.mock("../lib/airtable", () => ({
  getRecord: (...args: unknown[]) => mockGetRecord(...args),
  listRecords: (...args: unknown[]) => mockListRecords(...args),
  createRecord: (...args: unknown[]) => mockCreateRecord(...args),
  updateRecord: (...args: unknown[]) => mockUpdateRecord(...args),
}));

describe("events API", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it("stores analytics events", async () => {
    const { POST } = await import("../app/api/events/route");
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "upload.started", source: "/mobile" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "upload.started", source: "/mobile" }),
    );
  });
});

describe("rating compute API", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockListRecords.mockResolvedValue({ records: [], offset: undefined });
  });

  it("computes document rating deterministically", async () => {
    const { POST } = await import("../app/api/rating/compute/route");
    const uploadedAt = new Date(Date.now() - 30_000).toISOString();
    mockGetRecord.mockResolvedValueOnce({
      id: "doc-api",
      createdTime: uploadedAt,
      fields: {
        CompanyId: "comp-900",
        Status: "confirmed",
        Meta: { name: "api.pdf", mimeType: "application/pdf", size: 1024 },
        LatestAiConfidence: 0.9,
        UploadedAt: uploadedAt,
        ClassifiedAt: new Date().toISOString(),
      },
    });
    const req = new Request("http://localhost/api/rating/compute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "document", documentId: "doc-api" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.rating.score).toBeGreaterThan(0);
    expect(payload.rating.companyId).toBe("comp-900");
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "rating.computed", payload: expect.objectContaining({ scope: "document" }) }),
    );
  });
});
