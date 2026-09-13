import {beforeEach, describe, expect, it} from "vitest";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadSettings, saveSettings} from "@poe/utils/LocalStorage";
import {
  createFavorite,
  createFavoriteGroup,
  createStaticFavorite,
  duplicateFavorite,
  listFavorites,
  removeFavorite,
  reorderFavorites,
  setFavoriteHidden,
  updateFavoriteGroup,
  updateFavoriteMetadata,
  updateFavoriteSnapshot,
  updateStaticFavorite,
} from "./FavoriteStorage";
import {DEFAULT_FAVORITE_COLOR, isFavoriteGroup, isRegexFavorite, isStaticFavorite, parseFavoriteRecords} from "./FavoriteTypes";

const snapshot = {
  pageKey: "vendor" as const,
  regex: "r-g-b",
  configuration: {...defaultSettings.vendor, anyThreeColorLink: true},
  context: {language: "ENGLISH"},
  languageDependent: false,
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
    const updated = listFavorites("mapping")[1];
    expect(updated && isRegexFavorite(updated) ? updated.regex : undefined).toBe("r-g-b updated");
    expect(loadSettings("mapping").vendor).toEqual(defaultSettings.vendor);

    removeFavorite("mapping", second.id);
    expect(listFavorites("mapping")).toHaveLength(1);
  });

  it("drops malformed, unsupported, duplicate and unknown-page records", () => {
    const valid = createFavorite("mapping", snapshot, {name: "Valid", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});
    expect(parseFavoriteRecords([valid, valid, {...valid, id: "bad-version", schemaVersion: 2}, {...valid, id: "bad-page", pageKey: "flasks"}, null])).toEqual([valid]);
  });

  it("accepts production favorites without a kind discriminator", () => {
    const current = createFavorite("mapping", snapshot, {name: "Legacy", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});
    const {kind: _kind, ...productionRecord} = current;

    expect(parseFavoriteRecords([productionRecord])).toEqual([current]);
  });

  it("stores groups as live references and maintains them when members are deleted", () => {
    const first = createFavorite("mapping", snapshot, {name: "First", description: "", color: DEFAULT_FAVORITE_COLOR, tags: ["Maps"]});
    const second = createFavorite("mapping", {...snapshot, regex: "second"}, {name: "Second", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});
    const third = createFavorite("mapping", {...snapshot, regex: "third"}, {name: "Third", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});
    const group = createFavoriteGroup("mapping", [first.id, second.id, third.id], "and", {name: "Group", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});

    expect(group).not.toHaveProperty("regex");
    expect(group).not.toHaveProperty("pageKey");
    setFavoriteHidden("mapping", group.id, true);
    updateFavoriteGroup("mapping", group.id, [third.id, first.id], "and", {...group, name: "Updated group"});
    const updated = listFavorites("mapping").find((favorite) => favorite.id === group.id);
    expect(updated && isFavoriteGroup(updated) ? updated.memberIds : undefined).toEqual([third.id, first.id]);
    expect(updated?.hidden).toBe(true);

    removeFavorite("mapping", third.id);
    expect(listFavorites("mapping").some((favorite) => favorite.id === group.id)).toBe(false);
  });

  it("creates groupable static favorites and duplicates every record type independently", () => {
    const generated = createFavorite("mapping", snapshot, {name: "Generated", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});
    const staticFavorite = createStaticFavorite("mapping", '  "custom"  ', {name: "Static", description: "custom regex", color: DEFAULT_FAVORITE_COLOR, tags: ["Custom"]});
    const group = createFavoriteGroup("mapping", [generated.id, staticFavorite.id], "and", {name: "Mixed", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []});

    const staticCopy = duplicateFavorite("mapping", staticFavorite.id);
    const groupCopy = duplicateFavorite("mapping", group.id);
    expect(isStaticFavorite(staticCopy) ? staticCopy.regex : undefined).toBe('"custom"');
    expect(staticCopy.id).not.toBe(staticFavorite.id);
    expect(staticCopy.name).toBe("Static copy");
    expect(groupCopy.id).not.toBe(group.id);
    expect(groupCopy && isFavoriteGroup(groupCopy) ? groupCopy.memberIds : undefined).toEqual(group.memberIds);
  });

  it("rejects updates when a static favorite no longer exists", () => {
    expect(() => updateStaticFavorite("mapping", "missing", '"changed"', {name: "Missing", description: "", color: DEFAULT_FAVORITE_COLOR, tags: []})).toThrow("Static favorite not found.");
  });

  it("hydrates legacy profiles with the current schema and an empty collection", () => {
    localStorage.setItem("profiles", JSON.stringify({legacy: {name: "legacy", version: 1}}));
    expect(loadSettings("legacy").version).toBe(defaultSettings.version);
    expect(loadSettings("legacy").favorites).toEqual([]);
  });
});
