import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("@shared/generatedData", () => ({fetchGeneratedFile: vi.fn()}));

describe("divination catalog loading", () => {
  afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  it("caches each language and requests the official generated filename", async () => {
    const {fetchGeneratedFile} = await import("@shared/generatedData");
    vi.mocked(fetchGeneratedFile).mockResolvedValue({tokens: [], optimizationTable: {}});
    const {loadDivinationCards} = await import("./loadData");
    await Promise.all([loadDivinationCards("ENGLISH"), loadDivinationCards("ENGLISH"), loadDivinationCards("PORTUGUESE")]);
    expect(fetchGeneratedFile).toHaveBeenCalledTimes(2);
    expect(fetchGeneratedFile).toHaveBeenCalledWith("divination-cards/Generated.DivinationCards.ENGLISH.min.json");
    expect(fetchGeneratedFile).toHaveBeenCalledWith("divination-cards/Generated.DivinationCards.PORTUGUESE.min.json");
  });

  it("retries a language after a rejected request", async () => {
    const {fetchGeneratedFile} = await import("@shared/generatedData");
    vi.mocked(fetchGeneratedFile).mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({tokens: [], optimizationTable: {}});
    const {loadDivinationCards} = await import("./loadData");
    await expect(loadDivinationCards("ENGLISH")).rejects.toThrow("offline");
    await expect(loadDivinationCards("ENGLISH")).resolves.toEqual({tokens: [], optimizationTable: {}});
    expect(fetchGeneratedFile).toHaveBeenCalledTimes(2);
  });
});
