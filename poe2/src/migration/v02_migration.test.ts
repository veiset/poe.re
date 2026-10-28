import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {defaultSettings} from "../settings";
import type {Poe2RegexFavoriteRecord, SelectOption, Settings} from "../settings";
import {migrateProfile} from "./migrations";
import {migrateV1ToV2} from "./v02_migration";
import {loadGeneratedData} from "@shared/generatedData";

const tokens: Record<string, object[]> = {
  waystone: [
    {id: 2039236504, regex: "ses", rawText: "(50-20)% less effect of Curses on Monsters", options: {prefix: false}},
    {id: -1307791168, regex: "bui", rawText: "Monsters have (50-110)% increased Stun Buildup", options: {prefix: true}},
  ],
  tablet: [
    {id: -2026817376, regex: "cs", rawText: "Expeditions contain (1-2) Vaal Relics in Map", options: {}},
    {id: 690095601, regex: "k o", rawText: "1 extra pack of Monsters around Vaal Beacons in Map", options: {}},
  ],
};
const current = {current: {poe2: {patch: "0.5.5.4.2", commit: "d1bab48"}}};
const fetchMock = vi.fn(async (url: string) => ({ok: true, json: async () =>
  url.endsWith("/current.json") ? current : {tokens: tokens[url.match(/\/(waystone|tablet)\//)![1]]}}));

const option = (name: string, extra: Partial<SelectOption>): SelectOption =>
  ({name, value: null, isSelected: true, ranges: [], regex: "", ...extra});
const curses = option("##% less effect of Curses on Monsters", {id: 2039236504, regex: "ses", ranges: [[50, 20]]});
const stun = option("Monsters have ##% increased Stun Buildup", {id: -1307791168, regex: "bui", ranges: [[50, 110]]});
const relics = option("Expeditions contain ## Vaal Relics in Map", {id: -2026817376, regex: "cs", ranges: [[1, 2]]});
// Saved before the data was regenerated in #549: an id from older data and the old regex
const oldCurses = {...curses, id: 1985506203, regex: "eff"};

const waystone = (wantedMods: SelectOption[], unwantedMods: SelectOption[]): Settings["waystone"] =>
  ({...defaultSettings.waystone, modifier: {...defaultSettings.waystone.modifier, wantedMods, unwantedMods}});
const tablet = (affixes: SelectOption[]): Settings["tablet"] =>
  ({...defaultSettings.tablet, modifier: {...defaultSettings.tablet.modifier, affixes}});
const v1 = (changes: Partial<Settings>): Settings => ({...defaultSettings, version: 1, ...changes});

const favorite: Poe2RegexFavoriteRecord = {
  schemaVersion: 1, id: "favorite", name: "No curses", description: "", color: "#c6930a", tags: [],
  createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  kind: "favorite", pageKey: "waystone", regex: '"!eff"', languageDependent: true, context: {language: "ENGLISH"},
  configuration: waystone([], [oldCurses]),
};

type DeepPartial<T> = T extends object ? {[K in keyof T]?: DeepPartial<T[K]>} : T;

// A profile as stored before versions, with mods picked on older data: curses on the #549 data
// (current id, old regex), stun on the #536 data (old id, # in the name), and the tablet mods and
// the favorite (saved without a kind) on the #457 data, where the expedition mod has since been removed
const v1Structure = {
  name: "default",
  language: "ENGLISH",
  waystone: {
    modifier: {
      round10: false,
      wantedModsSelectType: "any",
      wantedMods: [
        {id: -1935256818, name: "Monsters have #% increased Stun Buildup", isSelected: true, value: 60, ranges: [], regex: "dup$"},
      ],
      unwantedMods: [
        {id: 2039236504, name: "##% less effect of Curses on Monsters", isSelected: true, value: null, ranges: [[50, 20]], regex: "eff"},
      ],
    },
  },
  tablet: {
    modifier: {
      usesRemaining: false,
      numUsesRemaining: 10,
      round10: false,
      affixSelectType: "any",
      affixes: [
        {id: -947090577, name: "# extra pack of Monsters around Vaal Beacons in Map", isSelected: true, value: null, ranges: [], regex: "k o"},
        {id: -291672141, name: "##% increased Effect of Expedition Remnants in Map", isSelected: true, value: null, ranges: [[12, 18]], regex: "t o"},
      ],
    },
  },
  favorites: [{
    schemaVersion: 1, id: "favorite", name: "No curses", description: "", color: "#c6930a", tags: [],
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
    pageKey: "waystone", regex: "\"!rses o\"", languageDependent: true, context: {language: "ENGLISH"},
    configuration: {
      modifier: {
        wantedMods: [],
        unwantedMods: [
          {id: 1985506203, name: "##% less effect of Curses on Monsters", isSelected: true, value: null, ranges: [[30, 50]], regex: "rses o"},
        ],
      },
    },
  }],
};

// Only the parts the migration changes
const expectedV2Structure: DeepPartial<Settings> = {
  waystone: {
    modifier: {
      wantedMods: [
        {id: -1307791168, name: "Monsters have ##% increased Stun Buildup", isSelected: true, value: 60, ranges: [[50, 110]], regex: "bui"},
      ],
      unwantedMods: [
        {id: 2039236504, name: "##% less effect of Curses on Monsters", isSelected: true, value: null, ranges: [[50, 20]], regex: "ses"},
      ],
    },
  },
  tablet: {
    modifier: {
      affixes: [
        {id: 690095601, name: "# extra pack of Monsters around Vaal Beacons in Map", isSelected: true, value: null, ranges: [], regex: "k o"},
      ],
    },
  },
  favorites: [{
    configuration: {
      modifier: {
        unwantedMods: [
          {id: 2039236504, name: "##% less effect of Curses on Monsters", isSelected: true, value: null, ranges: [[50, 20]], regex: "ses"},
        ],
      },
    },
  }],
};

describe("v1 -> v2 migration", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", fetchMock);
    // The app finds the data before anything loads it, see GeneratedDataProvider
    await loadGeneratedData("poe2");
  });
  afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockClear(); });

  it("migrates a stored v1 profile to the v2 structure", async () => {
    // The stored profile on top of the defaults, as migrateProfile hands it over
    const migrated = await migrateV1ToV2({...defaultSettings, ...(v1Structure as object)});
    expect(migrated).toMatchObject(expectedV2Structure);
  });

  it("gives a mod saved with an old id and regex the current id and regex", async () => {
    const migrated = await migrateV1ToV2(v1({waystone: waystone([], [oldCurses])}));
    expect(migrated.waystone.modifier.unwantedMods).toEqual([curses]);
  });

  it("matches a mod by name when its id is unknown, with # and ## alike", async () => {
    const saved = {...stun, id: 888, name: "Monsters have #% increased Stun Buildup", regex: "OLD", value: 60};
    const migrated = await migrateV1ToV2(v1({waystone: waystone([saved], [])}));
    expect(migrated.waystone.modifier.wantedMods).toEqual([{...stun, value: 60}]);
  });

  it("gives a mod saved without an id its id", async () => {
    const migrated = await migrateV1ToV2(v1({tablet: tablet([{...relics, id: undefined, regex: "old"}])}));
    expect(migrated.tablet.modifier.affixes).toEqual([relics]);
  });

  it("drops mods that are no longer in the data", async () => {
    const migrated = await migrateV1ToV2(v1({waystone: waystone([], [option("Removed mod", {id: 123, regex: "rem"}), oldCurses])}));
    expect(migrated.waystone.modifier.unwantedMods).toEqual([curses]);
  });

  it("keeps a mod saved twice once, preferring the ticked copy", async () => {
    const migrated = await migrateV1ToV2(v1({waystone: waystone([{...stun, id: 888, isSelected: false}, {...stun, id: 999, value: 60}], [])}));
    expect(migrated.waystone.modifier.wantedMods).toEqual([{...stun, value: 60}]);
  });

  it("migrates the mods in waystone favorites", async () => {
    const migrated = await migrateV1ToV2(v1({favorites: [favorite]}));
    expect(migrated.favorites).toEqual([{...favorite, configuration: waystone([], [curses])}]);
  });

  it("runs for a profile without a version, and not for one on version 2", async () => {
    const {version: _version, ...unversioned} = v1({waystone: waystone([], [oldCurses])});
    expect(await migrateProfile(unversioned)).toEqual({...unversioned, version: 2, waystone: waystone([], [curses])});

    fetchMock.mockClear();
    const current = {...defaultSettings, waystone: waystone([], [oldCurses])};
    expect(await migrateProfile(current)).toEqual(current);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
