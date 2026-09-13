import {describe, expect, it} from "vitest";
import {defaultSettings} from "../../utils/SavedSettings";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";
import {detectProfileGame} from "@shared/components/profile/ProfileGame";
import {isRegexFavorite} from "../../core/favorites/FavoriteTypes";

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
      kind: "favorite" as const,
      id: "favorite-1",
      pageKey: "maps" as const,
      name: "Juicy maps",
      description: "",
      color: "#c6930a",
      tags: ["Mapping"],
      regex: "quant",
      configuration: {...defaultSettings.map, quantity: "80"},
      context: {language: "ENGLISH", league: "Standard"},
      languageDependent: true,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    };
    const settings = {...defaultSettings, name: "with-favorites", favorites: [favorite]};
    expect(decodeProfile(encodeProfile(settings)).favorites).toEqual([favorite]);

    const invalidPayload = btoa(JSON.stringify({game: "poe", settings: {name: "invalid", favorites: [{...favorite, pageKey: "unknown"}]}}));
    expect(decodeProfile(invalidPayload).favorites).toEqual([]);
  });

  it("treats imported favorites that predate the flag as language-dependent when they captured a language", () => {
    const legacyFavorite = {
      schemaVersion: 1,
      id: "favorite-legacy",
      pageKey: "maps",
      name: "Legacy maps",
      description: "",
      color: "#c6930a",
      tags: [],
      regex: "quant",
      configuration: defaultSettings.map,
      context: {language: "ENGLISH"},
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    };
    const payload = btoa(JSON.stringify({game: "poe", settings: {name: "legacy-favorite", favorites: [legacyFavorite]}}));

    const imported = decodeProfile(payload).favorites[0];
    expect(imported && isRegexFavorite(imported) ? imported.languageDependent : undefined).toBe(true);
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
