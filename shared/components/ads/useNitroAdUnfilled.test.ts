import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useNitroAdUnfilled} from "./useNitroAdUnfilled";

const loaded = (auctionTimeout?: number) =>
  act(() => {
    document.dispatchEvent(new CustomEvent("nitroAds.loaded", {detail: {auctionTimeout}}));
  });
const rendered = () =>
  act(() => {
    document.dispatchEvent(new CustomEvent("nitroAds.rendered", {detail: {}}));
  });
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useNitroAdUnfilled", () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement("div");
  });
  afterEach(() => {
    vi.useRealTimers();
    delete window.nitroAds;
  });

  it("stays filled while the script has not loaded", () => {
    const {result} = renderHook(() => useNitroAdUnfilled({current: el}));
    advance(60_000);
    expect(result.current).toBe(false);
  });

  it("reports unfilled when the container is still empty after the auction plus grace", () => {
    const {result} = renderHook(() => useNitroAdUnfilled({current: el}));
    loaded(2000);
    advance(6999);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it("stays filled when the container got content", () => {
    el.appendChild(document.createElement("iframe"));
    const {result} = renderHook(() => useNitroAdUnfilled({current: el}));
    loaded(1000);
    advance(10_000);
    expect(result.current).toBe(false);
  });

  it("cancels the check when an ad renders", () => {
    const {result} = renderHook(() => useNitroAdUnfilled({current: el}));
    loaded(1000);
    rendered();
    advance(10_000);
    expect(result.current).toBe(false);
  });

  it("schedules from mount when the script had already loaded", () => {
    window.nitroAds = {loaded: true};
    const {result} = renderHook(() => useNitroAdUnfilled({current: el}));
    advance(8000);
    expect(result.current).toBe(true);
  });
});
