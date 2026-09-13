import {parseUsageEventEnvelope} from "./UsageEvent";

const base = {
  schemaVersion: 1,
  anonymousId: "a8098c1a-f86e-4f3d-a39a-2a8f65e32c98",
  game: "poe",
} as const;

describe("parseUsageEventEnvelope", () => {
  it("parses a profile event and discards injected log properties", () => {
    expect(parseUsageEventEnvelope({
      ...base,
      event: "profile",
      action: "renamed",
      profileName: "Bossing",
      previousProfileName: "default",
      profileCount: 3,
      country: "FAKE",
      logType: "error",
    })).toEqual({
      ...base,
      event: "profile",
      action: "renamed",
      profileName: "Bossing",
      previousProfileName: "default",
      profileCount: 3,
    });
  });

  it("parses a favorite group with queryable metrics", () => {
    expect(parseUsageEventEnvelope({
      ...base,
      game: "poe2",
      event: "favorite_created",
      favoriteType: "group",
      profileName: "mapping",
      favoriteCount: 5,
      operator: "and",
      memberCount: 4,
    })).toEqual({
      ...base,
      game: "poe2",
      event: "favorite_created",
      favoriteType: "group",
      profileName: "mapping",
      favoriteCount: 5,
      operator: "and",
      memberCount: 4,
    });
  });

  it.each([
    {...base, event: "unknown", profileName: "default"},
    {...base, event: "profile", action: "created", profileName: ""},
    {...base, anonymousId: "not-a-uuid", event: "profile", action: "created", profileName: "default"},
    {...base, event: "favorite_created", favoriteType: "group", profileName: "default", favoriteCount: 1, operator: "and", memberCount: 1},
    {...base, event: "language_selected", profileName: "default", language: "FRENCH"},
  ])("rejects invalid input", (input) => {
    expect(parseUsageEventEnvelope(input)).toBeUndefined();
  });

  it("parses the low-frequency lifecycle events", () => {
    expect(parseUsageEventEnvelope({...base, event: "profile_exported", profileName: "mapping"})?.event).toBe("profile_exported");
    expect(parseUsageEventEnvelope({...base, event: "profile_import_failed", reason: "wrong_game"})?.event).toBe("profile_import_failed");
    expect(parseUsageEventEnvelope({...base, event: "favorite_deleted", favoriteType: "static", profileName: "mapping", favoriteCount: 2, ageBucket: "1_7_days"})?.event).toBe("favorite_deleted");
    expect(parseUsageEventEnvelope({...base, event: "trade_clicked", profileName: "mapping", page: "maps"})?.event).toBe("trade_clicked");
  });
});
