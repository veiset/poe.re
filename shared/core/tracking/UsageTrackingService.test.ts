import {UsageEvent} from "./UsageEvent";
import {UsageTrackingService} from "./UsageTrackingService";

type SnapshotEvent = Extract<UsageEvent, {event: "usage_snapshot"}>;

class TestUsageTrackingService extends UsageTrackingService<SnapshotEvent> {
  constructor() { super("poe"); }

  snapshot(): void {
    this.trackDailySnapshot({event: "usage_snapshot", profileCount: 2, favoriteCount: 8, language: "ENGLISH"});
  }
}

describe("UsageTrackingService daily snapshot", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends no more than once per 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    vi.stubGlobal("fetch", fetchMock);
    const service = new TestUsageTrackingService();

    service.snapshot();
    service.snapshot();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    service.snapshot();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
