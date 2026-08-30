import {describe, expect, it} from "vitest";
import {defaultSettings} from "../../utils/SavedSettings";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";
import {detectProfileGame} from "@shared/components/profile/ProfileGame";

describe("profile transfer", () => {
  it("round-trips the default profile", () => {
    const encoded = encodeProfile(defaultSettings);
    expect(detectProfileGame(encoded)).toBe("poe");
    expect(decodeProfile(encoded)).toEqual(defaultSettings);
  });

  it("hydrates omitted defaults while preserving changes", () => {
    const settings = {
      ...defaultSettings,
      name: "mapping",
      map: {...defaultSettings.map, badIds: [12, 34]},
    };

    expect(decodeProfile(encodeProfile(settings))).toEqual(settings);
  });

  it("round-trips favorites in their stored order and filters invalid records", () => {
    const favorite = {
      schemaVersion: 1 as const,
      id: "favorite-1",
      pageKey: "maps" as const,
      name: "Juicy maps",
      description: "",
      color: "#c6930a",
      tags: ["Mapping"],
      regex: "quant",
      configuration: {...defaultSettings.map, quantity: "80"},
      context: {language: "ENGLISH", league: "Standard"},
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    };
    const settings = {...defaultSettings, name: "with-favorites", favorites: [favorite]};
    expect(decodeProfile(encodeProfile(settings)).favorites).toEqual([favorite]);

    const invalidPayload = btoa(JSON.stringify({game: "poe", settings: {name: "invalid", favorites: [{...favorite, pageKey: "unknown"}]}}));
    expect(decodeProfile(invalidPayload).favorites).toEqual([]);
  });

  it("imports legacy default exports that omitted the name", () => {
    expect(decodeProfile(btoa("{}"))).toEqual(defaultSettings);
  });

  it("rejects non-object payloads", () => {
    expect(() => decodeProfile(btoa("null"))).toThrow();
  });

  it("rejects PoE2 exports", () => {
    const encoded = btoa(JSON.stringify({game: "poe2", settings: {name: "wrong game"}}));
    expect(() => decodeProfile(encoded)).toThrow();
  });
});
