import {afterEach, describe, expect, it, vi} from "vitest";
import {defaultSettings} from "./settings";
import type {Poe2RegexFavoriteRecord, SelectOption} from "./settings";
import {rebaseWaystoneSettings, renderPoe2Favorite} from "./favoriteLanguageRenderer";
import {loadGeneratedData} from "@shared/generatedData";

const curses = {id: 2039236504, name: "##% less effect of Curses on Monsters", regex: "ses", ranges: [[50, 20]], sourceIndex: 0};
const stun = {id: -1307791168, name: "Monsters have ##% increased Stun Buildup", regex: "bui", ranges: [[50, 110]], sourceIndex: 1};
const data = [curses, stun];

const saved = (option: Partial<SelectOption>): SelectOption =>
  ({name: curses.name, value: null, isSelected: true, ranges: curses.ranges, regex: curses.regex, ...option});

const waystone = (unwantedMods: SelectOption[]) => ({
  ...defaultSettings.waystone, modifier: {...defaultSettings.waystone.modifier, unwantedMods},
});

describe("refreshing saved waystone mods from the loaded data", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("gives a saved mod the current regex, name and ranges", () => {
    const settings = rebaseWaystoneSettings(waystone([saved({id: curses.id, name: "Old name", regex: "eff", ranges: [[60, 30]]})]), data, data);
    expect(settings.modifier.unwantedMods).toEqual([saved({id: curses.id})]);
  });

  it("drops saved mods that are no longer in the data", () => {
    const settings = rebaseWaystoneSettings(waystone([
      saved({id: 123, name: "Removed mod", regex: "rem"}),
      saved({id: curses.id}),
    ]), data, data);
    expect(settings.modifier.unwantedMods).toEqual([saved({id: curses.id})]);
  });

  it("renders a favorite in its own language with the current regex", async () => {
    const current = {current: {poe2: {patch: "0.5.5.4.2", commit: "d1bab48"}}};
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ok: true, json: async () => url.endsWith("/current.json") ? current : {tokens: [
      {id: curses.id, regex: "ses", rawText: "(50-20)% less effect of Curses on Monsters", options: {prefix: false}},
    ]}})));
    // The app finds the data before anything loads it, see GeneratedDataProvider
    await loadGeneratedData("poe2");
    const favorite: Poe2RegexFavoriteRecord = {
      schemaVersion: 1, id: "favorite", name: "Favorite", description: "", color: "#c6930a", tags: [],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      kind: "favorite", pageKey: "waystone", regex: '"!eff"', languageDependent: true, context: {language: "ENGLISH"},
      configuration: waystone([saved({id: curses.id, regex: "eff"})]),
    };
    await expect(renderPoe2Favorite(favorite, "ENGLISH")).resolves.toBe('"!ses"');
  });
});
