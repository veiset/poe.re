import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";

const current = {current: {poe1: {patch: "3.29.3.3", commit: "d1bab48"}}};
const ok = (body: unknown) => ({ok: true, json: async () => body});
const failed = (status: number, statusText: string) => ({ok: false, status, statusText});
const answer = async () => ok(current);
const fetchMock = vi.fn(answer);

// Each test imports the modules again, so no data is found yet. The page shows the patch it gets.
async function renderApp(beforeRender?: () => Promise<unknown>) {
  const {GeneratedDataProvider, useGeneratedData} = await import("./GeneratedDataProvider");
  const Page = () => {
    const data = useGeneratedData();
    return <p>Page on {data.source === "r2" ? data.patch : "local"}</p>;
  };
  render(<GeneratedDataProvider game="poe1" beforeRender={beforeRender}><Page/></GeneratedDataProvider>);
}

describe("GeneratedDataProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    fetchMock.mockImplementation(answer);
  });

  it("shows a spinner until it has found the data, then the app with it", async () => {
    let respond: (response: unknown) => void = () => {};
    fetchMock.mockImplementationOnce((() => new Promise((resolve) => { respond = resolve; })) as never);
    await renderApp();
    expect(screen.getByText("Loading game data…")).toBeInTheDocument();
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();

    await act(async () => respond(ok(current)));
    expect(screen.getByText("Page on 3.29.3.3")).toBeInTheDocument();
    expect(screen.queryByText("Loading game data…")).not.toBeInTheDocument();
  });

  it("runs beforeRender once it has the data, before the app renders", async () => {
    const beforeRender = vi.fn(async () => {
      expect(fetchMock).toHaveBeenCalled();
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });
    await act(() => renderApp(beforeRender));
    expect(beforeRender).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Page on 3.29.3.3")).toBeInTheDocument();
  });

  it("still renders the app when beforeRender fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await act(() => renderApp(async () => { throw new Error("migration failed"); }));
    expect(screen.getByText("Page on 3.29.3.3")).toBeInTheDocument();
  });

  it("says when it can't find the data, and tries again", async () => {
    fetchMock.mockResolvedValueOnce(failed(503, "Service Unavailable") as never);
    const beforeRender = vi.fn(async () => {});
    await act(() => renderApp(beforeRender));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Error loading data");
    expect(alert).toHaveTextContent("503 Service Unavailable");
    expect(screen.getByRole("link", {name: "Discord"})).toHaveAttribute("href", "https://discord.gg/T8BzKnatY6");
    expect(screen.getByRole("link", {name: "GitHub"}).getAttribute("href"))
      .toMatch(/^https:\/\/github\.com\/veiset\/poe\.re\/issues\/new\?.*title=.*503/);
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    expect(beforeRender).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByRole("button", {name: "Try again"})));
    expect(screen.getByText("Page on 3.29.3.3")).toBeInTheDocument();
    expect(beforeRender).toHaveBeenCalledTimes(1);
  });
});
