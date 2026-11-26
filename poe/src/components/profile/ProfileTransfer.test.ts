import {describe, expect, it} from "vitest";
import {defaultSettings} from "../../utils/SavedSettings";
import {exportSettings, readProfile} from "./ProfileTransfer";
import {isRegexFavorite} from "../../core/favorites/FavoriteTypes";

describe("profile transfer", () => {
  it("round-trips the default profile", () => {
    expect(readProfile(exportSettings(defaultSettings))).toEqual(defaultSettings);
  });

  it("exports only what differs from the defaults, and hydrates the rest", () => {
    const settings = {
      ...defaultSettings,
      name: "mapping",
      map: {...defaultSettings.map, badIds: [12, 34]},
    };

    expect(exportSettings(settings)).toEqual({
      name: "mapping", language: defaultSettings.language, version: defaultSettings.version, map: {badIds: [12, 34]},
    });
    expect(readProfile(exportSettings(settings))).toEqual(settings);
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
    expect(readProfile(exportSettings(settings)).favorites).toEqual([favorite]);

    expect(readProfile({name: "invalid", favorites: [{...favorite, pageKey: "unknown"}]}).favorites).toEqual([]);
  });

  it("treats favorites that predate the flag as language-dependent when they captured a language", () => {
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

    const imported = readProfile({name: "legacy-favorite", favorites: [legacyFavorite]}).favorites[0];
    expect(imported && isRegexFavorite(imported) ? imported.languageDependent : undefined).toBe(true);
  });

  it("keeps the profile version, and reads settings without one as version 1", () => {
    expect(readProfile(exportSettings({...defaultSettings, version: 1})).version).toBe(1);
    expect(readProfile({name: "old"}).version).toBe(1);
  });

  it.each([null, "maps", ["maps"], {name: " "}])("rejects settings that are not a profile (%#)", (settings) => {
    expect(() => readProfile(settings)).toThrow();
  });
});
