import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const current = {current: {poe1: {patch: "3.29.3.3", commit: "d1bab48"}, poe2: {patch: "0.5.5.4.2", commit: "72cc002"}}};
const ok = (body: unknown) => ({ok: true, json: async () => body});
const notFound = {ok: false, status: 404, statusText: "Not Found"};
// Answers current.json, and every other file with its own URL
const answer = async (url: string, _init?: RequestInit) => ok(url.endsWith("/current.json") ? current : {url});
const fetchMock = vi.fn(answer);

// Each test imports the module again, so no data is found yet
const load = () => import("./generatedData");

describe("generated data from R2", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    fetchMock.mockImplementation(answer);
  });

  it("finds the game's latest upload in current.json, revalidated on every visit", async () => {
    const {loadGeneratedData} = await load();
    await expect(loadGeneratedData("poe2")).resolves.toEqual({
      source: "r2", game: "poe2", dataBaseUrl: "https://data.poe.re", patch: "0.5.5.4.2", commit: "72cc002",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://data.poe.re/current.json", {cache: "no-cache", signal: expect.any(AbortSignal)});
  });

  it("loads a file of that upload, with its commit", async () => {
    const {loadGeneratedData, fetchGeneratedFile} = await load();
    await loadGeneratedData("poe2");
    await expect(fetchGeneratedFile("relic/Generated.Relic.ENGLISH.min.json")).resolves.toEqual({
      url: "https://data.poe.re/generated/poe2/0.5.5.4.2/relic/Generated.Relic.ENGLISH.min.json?v=72cc002",
    });
  });

  it("won't load a file before the data is found", async () => {
    const {fetchGeneratedFile} = await load();
    await expect(fetchGeneratedFile("a.json")).rejects.toThrow("before the generated data is found");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives up on a request that doesn't load within 30 seconds", async () => {
    const {loadGeneratedData} = await load();
    fetchMock.mockRejectedValueOnce(new DOMException("signal timed out", "TimeoutError"));
    await expect(loadGeneratedData("poe1")).rejects.toThrow("https://data.poe.re/current.json didn't load within 30 seconds");
  });

  it("fails when current.json fails, or has no upload for the game", async () => {
    const {loadGeneratedData} = await load();
    fetchMock.mockResolvedValueOnce({ok: false, status: 503, statusText: "Service Unavailable"} as never);
    await expect(loadGeneratedData("poe1")).rejects.toThrow("503 Service Unavailable");
    fetchMock.mockResolvedValueOnce(ok({current: {poe1: current.current.poe1}}));
    await expect(loadGeneratedData("poe2")).rejects.toThrow("current.json has no upload for poe2");
  });

  it("reports a file that fails to load", async () => {
    const {loadGeneratedData, fetchGeneratedFile, onGeneratedDataError} = await load();
    await loadGeneratedData("poe1");
    const listener = vi.fn();
    onGeneratedDataError(listener);

    fetchMock.mockResolvedValueOnce(notFound as never);
    await expect(fetchGeneratedFile("mapmods/Generated.Map.ENGLISH.min.json")).rejects.toThrow("404");
    expect(listener).toHaveBeenCalledWith({
      file: "mapmods/Generated.Map.ENGLISH.min.json",
      message: "Failed to load https://data.poe.re/generated/poe1/3.29.3.3/mapmods/Generated.Map.ENGLISH.min.json?v=d1bab48: 404 Not Found",    });
  });
});
