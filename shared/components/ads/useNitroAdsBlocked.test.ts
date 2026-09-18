import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useNitroAdsBlocked} from "./useNitroAdsBlocked";

const fire = (name: "np.blocking" | "nitroAds.loaded" | "nitroAds.failed") =>
  act(() => {
    document.dispatchEvent(new CustomEvent(name, {detail: {blocking: true}}));
  });

const setBlocking = (blocking: boolean) => {
  window.npDetect = {blocking};
};
const setLoaded = (loaded: boolean) => {
  window.nitroAds = {...window.nitroAds, loaded};
};

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useNitroAdsBlocked", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // performance.now() is what the deadline is measured from.
    vi.spyOn(performance, "now").mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.npDetect;
    delete window.nitroAds;
    delete window.nitroAdsFailed;
  });

  it("is unblocked while nothing has been detected", () => {
    const {result} = renderHook(() => useNitroAdsBlocked());
    expect(result.current).toBe(false);
  });

  it("blocks when np.blocking fires and the script never loaded", () => {
    const {result} = renderHook(() => useNitroAdsBlocked());
    setBlocking(true);
    fire("np.blocking");
    expect(result.current).toBe(true);
  });

  it("blocks when the loader tag reports the script failed", () => {
    const {result} = renderHook(() => useNitroAdsBlocked());
    window.nitroAdsFailed = true;
    fire("nitroAds.failed");
    expect(result.current).toBe(true);
  });

  it("starts blocked when detection finished before mount", () => {
    setBlocking(true);
    const {result} = renderHook(() => useNitroAdsBlocked());
    expect(result.current).toBe(true);
  });

  it("unblocks when the script loads after the pixel failed", () => {
    const {result} = renderHook(() => useNitroAdsBlocked());
    setBlocking(true);
    fire("np.blocking");
    expect(result.current).toBe(true);

    setLoaded(true);
    fire("nitroAds.loaded");
    expect(result.current).toBe(false);
  });

  it("ignores np.blocking once the script has loaded", () => {
    setLoaded(true);
    const {result} = renderHook(() => useNitroAdsBlocked());
    setBlocking(true);
    fire("np.blocking");
    expect(result.current).toBe(false);
  });

  it("blocks when the script has not reported loaded by the deadline", () => {
    const {result} = renderHook(() => useNitroAdsBlocked());
    advance(5999);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it("measures the deadline from navigation start", () => {
    vi.spyOn(performance, "now").mockReturnValue(4000);
    const {result} = renderHook(() => useNitroAdsBlocked());
    advance(2000);
    expect(result.current).toBe(true);
  });

  it("unblocks when a slow script loads after the deadline", () => {
    const {result} = renderHook(() => useNitroAdsBlocked());
    advance(6000);
    expect(result.current).toBe(true);
    setLoaded(true);
    fire("nitroAds.loaded");
    expect(result.current).toBe(false);
  });

  it("never arms the deadline when the script is already loaded", () => {
    setLoaded(true);
    const {result} = renderHook(() => useNitroAdsBlocked());
    advance(60_000);
    expect(result.current).toBe(false);
  });

  it("stops listening on unmount", () => {
    const {result, unmount} = renderHook(() => useNitroAdsBlocked());
    unmount();
    setBlocking(true);
    fire("np.blocking");
    expect(result.current).toBe(false);
  });
});
