import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import AppHeader from "@/app/_components/AppHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
}));

describe("AppHeader", () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.spyOn(global, "fetch").mockImplementation(fetchMock as typeof fetch);
  });

  afterEach(() => {
    (global.fetch as unknown as { mockRestore: () => void }).mockRestore();
  });

  it("highlights the active link and posts event on click", async () => {
    const user = userEvent.setup();
    render(<AppHeader />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Manual" })).not.toHaveAttribute("aria-current");

    await user.click(screen.getByRole("link", { name: "Manual" }));

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).body).toContain("nav.header_click");
  });
});
