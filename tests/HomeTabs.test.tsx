import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import HomeTabs from "@/app/(app)/home/_components/HomeTabs";

describe("HomeTabs", () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.spyOn(global, "fetch").mockImplementation(fetchMock as typeof fetch);
  });

  afterEach(() => {
    (global.fetch as unknown as { mockRestore: () => void }).mockRestore();
  });

  it("emits nav.tab_change when switching tabs", async () => {
    const user = userEvent.setup();
    render(<HomeTabs />);

    await user.click(screen.getByRole("tab", { name: "Work" }));

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).body).toContain("nav.tab_change");
  });
});
