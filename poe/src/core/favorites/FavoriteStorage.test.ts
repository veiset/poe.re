import {beforeEach, describe, expect, it} from "vitest";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadSettings, saveSettings} from "@poe/utils/LocalStorage";
import {createFavorite, listFavorites, removeFavorite, reorderFavorites, updateFavoriteMetadata, updateFavoriteSnapshot} from "./FavoriteStorage";
import {DEFAULT_FAVORITE_COLOR, parseFavoriteRecords} from "./FavoriteTypes";

const snapshot = {
  pageKey: "vendor" as const,
  regex: "r-g-b",
  configuration: {...defaultSettings.vendor, anyThreeColorLink: true},
  context: {language: "ENGLISH"},
};

describe("favorite storage", () => {
  beforeEach(() => {
    localStorage.clear();
    saveSettings({...defaultSettings, name: "mapping", favorites: []});
  });

  it("creates, updates, reorders and removes records without changing normal settings", () => {
    const first = createFavorite("mapping", snapshot, {name: "RGB", description: "vendor recipe", color: DEFAULT_FAVORITE_COLOR, tags: ["Leveling", "leveling", "  "]});
    const second = createFavorite("mapping", {...snapshot, regex: "6s"}, {name: "Six sockets", description: "", color: "#5fa8d6", tags: []});
    expect(listFavorites("mapping").map((favorite) => favorite.id)).toEqual([first.id, second.id]);
    expect(first.tags).toEqual(["Leveling"]);

    updateFavoriteMetadata("mapping", first.id, {...first, name: "RGB links", tags: ["Acts"]});
    updateFavoriteSnapshot("mapping", first.id, {...snapshot, regex: "r-g-b updated"});
    reorderFavorites("mapping", [second.id, first.id]);
    expect(listFavorites("mapping").map((favorite) => favorite.name)).toEqual(["Six sockets", "RGB links"]);
    expect(listFavorites("mapping")[1].regex).toBe("r-g-b updated");
    expect(loadSettings("mapping").vendor).toEqual(defaultSettings.vendor);

    removeFavorite("mapping", second.id);
    expect(listFavorites("mapping")).toHaveLength(1);
  });

  it("drops malformed, unsupported, duplicate and unknown-page records", () => {
    const valid = createFavorite("mapping", snapshot, {name: "Valid", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});
    expect(parseFavoriteRecords([valid, valid, {...valid, id: "bad-version", schemaVersion: 2}, {...valid, id: "bad-page", pageKey: "flasks"}, null])).toEqual([valid]);
  });

  it("hydrates legacy profiles with the current schema and an empty collection", () => {
    localStorage.setItem("profiles", JSON.stringify({legacy: {name: "legacy", version: 1}}));
    expect(loadSettings("legacy").version).toBe(defaultSettings.version);
    expect(loadSettings("legacy").favorites).toEqual([]);
  });
});
