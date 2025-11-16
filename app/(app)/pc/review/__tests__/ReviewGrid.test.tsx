import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ReviewGrid from "../_components/ReviewGrid";
import type { ReviewListItem } from "@/lib/schemas/review";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => {
  const params = new URLSearchParams();
  const readonlyParams = {
    get: params.get.bind(params),
    toString: params.toString.bind(params),
    entries: params.entries.bind(params),
    forEach: params.forEach.bind(params),
    keys: params.keys.bind(params),
    values: params.values.bind(params),
    [Symbol.iterator]: params[Symbol.iterator].bind(params),
  } as unknown as ReadonlyURLSearchParams;
  return {
    useRouter: () => ({ replace: replaceMock }),
    usePathname: () => "/pc/review",
    useSearchParams: () => readonlyParams,
  };
});

describe("ReviewGrid", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    replaceMock.mockClear();
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/review/doc-1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "doc-1",
              fileName: "Alpha Invoice.pdf",
              blobUrl: "https://example.com/file.pdf",
              mimeType: "application/pdf",
              size: 1024,
              status: "pending",
              aiLabel: "invoice",
              aiConfidence: 0.9,
              companyId: "comp-1",
              uploaderUserId: "user-1",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rejectReason: null,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.startsWith("/api/review")) {
        return Promise.resolve(
          new Response(JSON.stringify({ items: [], nextCursor: null }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("opens drawer and triggers sort replace", async () => {
    const initialItems: ReviewListItem[] = [
      {
        id: "doc-1",
        fileName: "Alpha Invoice.pdf",
        blobUrl: "https://example.com/file.pdf",
        mimeType: "application/pdf",
        size: 1024,
        status: "pending",
        aiLabel: "invoice",
        aiConfidence: 0.92,
        companyId: "comp-1",
        companyName: "Alpha",
        uploaderUserId: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rejectReason: null,
      },
    ];

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ReviewGrid
          initialItems={initialItems}
          initialCursor={undefined}
          query={{ q: "", status: "pending", companyId: "", sort: "createdAt", order: "desc" }}
        />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByText(/Alpha Invoice/i));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Alpha Invoice/i })).toBeVisible());

    await userEvent.click(screen.getByRole("button", { name: /AI ラベル/ }));
    expect(replaceMock).toHaveBeenCalledWith("/pc/review?sort=aiLabel&order=asc", { scroll: false });
  });
});
