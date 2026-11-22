import {describe, expect, it} from "vitest";
import {defaultSettings, MapSettings, SavedSettings} from "../SavedSettings";
import {generateMapModRegex} from "@poe/pages/maps/OptimizedMapOutput";
import {generateResultString} from "../OutputString";
import {generateGemsRegex} from "@poe/pages/gems/GemsOutput";
import {generateUltimatumRegex} from "@poe/pages/ultimatum/UltimatumOutput";
import {
  parseGemsRegex,
  parseHeistRegex,
  parseMapRegex,
  parsePoe1RegexCandidates,
  parseUltimatumRegex,
  parseVendorRegex,
} from "./ImportRegex";
import type {MapModsRegex} from "@shared/typedefs/poe1/MapMods";
import type {GemsRegex} from "@shared/typedefs/poe1/Gems";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";

const sampleMapMods: MapModsRegex = {
  tokens: [
    {
      id: 101,
      regex: "cco",
      rawText: "Map Boss is accompanied by a Synthesis Boss",
      generalizedText: "^map boss is accompanied by a synthesis boss$",
      options: {scary: 1001, nm: true, prefix: true, rewards: []},
    },
    {
      id: 102,
      regex: "te o",
      rawText: "Players have (20-60)% less Recovery Rate of Life and Energy Shield",
      generalizedText: "^players have #% less recovery rate of life and energy shield$",
      options: {scary: 650, nm: false, prefix: false, rewards: []},
    },
    {
      id: 103,
      regex: "of elem",
      rawText: "Monsters reflect 18% of Elemental Damage",
      generalizedText: "^monsters reflect #% of elemental damage$",
      options: {scary: 900, nm: false, prefix: true, rewards: []},
    },
    {
      id: 104,
      regex: "of ph",
      rawText: "Monsters reflect 18% of Physical Damage",
      generalizedText: "^monsters reflect #% of physical damage$",
      options: {scary: 900, nm: false, prefix: true, rewards: []},
    },
  ],
  optimizationTable: {
    "103:104": {
      ids: [103, 104],
      regex: "reflect",
      weight: 7,
      count: 2,
    },
  },
};

const sampleGems: GemsRegex = {
  tokens: [
    {id: 1, regex: "^fireb", rawText: "Fireball", generalizedText: "fireball", options: {c: "B", regexNoTransfiguredMatch: "^fireb", support: false}},
    {id: 2, regex: "ty su", rawText: "Trinity Support", generalizedText: "trinity support", options: {c: "B", regexNoTransfiguredMatch: "ty su", support: true}},
  ],
  optimizationTable: {},
};

const sampleUltimatum: Ultimatum = {
  modifiers: [
    {id: "Ruin", name: "Stalking Ruin", description: "Ruin", tier: 1, regex: "^ruin$"},
  ],
  rewards: [
    {id: "DoubleCurrency", reward: "Doubles sacrificed Currency", regex: "ced c"},
    {id: "UniqueItem", reward: "Unique Item", regex: ""},
  ],
  sacrifices: [
    {id: "DivineOrb", name: "Divine Orb", amounts: [1], icon: "", reward: "Doubles sacrificed Currency", regex: "ne or"},
  ],
};

describe("PoE 1 Regex Import", () => {
  it("round-trips Map Mods regexes with exclusions, inclusions, yields, qualities, states, map types and price", () => {
    const mapSettings: MapSettings = {
      ...structuredClone(defaultSettings.map),
      badIds: [103, 104],
      goodIds: [101, 102],
      allGoodMods: false,
      quantity: "80",
      packsize: "25",
      mapDropChance: "50",
      itemRarity: "40",
      currency: "30",
      scarab: "20",
      divination: "15",
      anyYield: false,
      quality: {
        regular: "20",
        currency: "",
        divination: "",
        rarity: "",
        packSize: "10",
        scarab: "",
      },
      anyQuality: true,
      rarity: {normal: false, magic: false, rare: true, include: true},
      corrupted: {enabled: true, include: false},
      unidentified: {enabled: true, include: false},
      mapTypesInRegex: true,
      mapTypes: {
        shaper: {enabled: true, include: false},
        elder: {enabled: false, include: false},
        conqueror: {enabled: true, include: true},
        originator: {enabled: false, include: false},
        blighted: {enabled: false, include: false},
        blightRavaged: {enabled: false, include: false},
      },
      asyncPriceRange: {
        min: "10",
        max: "150",
        currency: "chaos",
        enabled: true,
        tradeEnabled: false,
      },
    };

    const generated = generateMapModRegex(mapSettings, sampleMapMods, "ENGLISH");
    const parsed = parseMapRegex(generated, defaultSettings, sampleMapMods);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.map.badIds).toEqual([103, 104]);
    expect(parsed!.settings.map.goodIds).toEqual([101, 102]);
    expect(parsed!.settings.map.allGoodMods).toBe(false);
    expect(parsed!.settings.map.quantity).toBe("80");
    expect(parsed!.settings.map.packsize).toBe("25");
    expect(parsed!.settings.map.mapDropChance).toBe("50");
    expect(parsed!.settings.map.itemRarity).toBe("40");
    expect(parsed!.settings.map.currency).toBe("30");
    expect(parsed!.settings.map.scarab).toBe("20");
    expect(parsed!.settings.map.divination).toBe("15");
    expect(parsed!.settings.map.quality.regular).toBe("20");
    expect(parsed!.settings.map.quality.packSize).toBe("10");
    expect(parsed!.settings.map.anyQuality).toBe(true);
    expect(parsed!.settings.map.rarity).toEqual({normal: false, magic: false, rare: true, include: true});
    expect(parsed!.settings.map.corrupted).toEqual({enabled: true, include: false});
    expect(parsed!.settings.map.unidentified).toEqual({enabled: true, include: false});
    expect(parsed!.settings.map.mapTypesInRegex).toBe(true);
    expect(parsed!.settings.map.mapTypes.shaper).toEqual({enabled: true, include: false});
    expect(parsed!.settings.map.mapTypes.conqueror).toEqual({enabled: true, include: true});
    expect(parsed!.settings.map.mapTypes.elder.enabled).toBe(false);
    expect(parsed!.settings.map.asyncPriceRange).toEqual({
      min: "10",
      max: "150",
      currency: "chaos",
      enabled: true,
      tradeEnabled: false,
    });
    expect(generateMapModRegex(parsed!.settings.map, sampleMapMods, "ENGLISH")).toBe(generated);
  });

  it("matches hand-written map mod regexes using reverse regex lookup and preserves custom text", () => {
    const parsed = parseMapRegex('"!recovery rate" "as d.*80%" "my-custom"', defaultSettings, sampleMapMods);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.map.badIds).toEqual([102]);
    expect(parsed!.settings.map.quantity).toBe("80");
    expect(parsed!.settings.map.customText).toEqual({value: '"my-custom"', enabled: true});
  });

  it("round-trips PoE 1 Vendor regexes including simplified 3-link combinations", () => {
    const vendor: SavedSettings["vendor"] = {
      ...structuredClone(defaultSettings.vendor),
      anySixSocket: true,
      anyFourLink: true,
      movement: {ten: true, fifteen: true},
      colors: {
        ...structuredClone(defaultSettings.vendor.colors),
        rrr: true,
        rrg: true,
        rgb: true,
        ggA: true,
        baa: true,
        rb: true,
        specLink: true,
        specLinkColors: {r: 2, g: 1, b: undefined},
      },
      plusGems: {
        ...structuredClone(defaultSettings.vendor.plusGems),
        fire: true,
        lightning: true,
      },
      damage: {
        ...structuredClone(defaultSettings.vendor.damage),
        phys: true,
      },
      weapon: {
        ...structuredClone(defaultSettings.vendor.weapon),
        wand: true,
        sceptre: true,
      },
    };

    const generated = generateResultString(vendor);
    const parsed = parseVendorRegex(generated, defaultSettings);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.vendor).toEqual(vendor);
    expect(generateResultString(parsed!.settings.vendor)).toBe(generated);
  });

  it("round-trips PoE 1 Gems regexes", () => {
    const gemsSettings: SavedSettings["gems"] = {
      ...structuredClone(defaultSettings.gems),
      selected: [1, 2],
      levelEnabled: true,
      levelMin: "20",
      levelMax: "21",
      qualityEnabled: true,
      qualityMin: "20",
      qualityMax: "23",
    };

    const generated = generateGemsRegex(gemsSettings, sampleGems);
    const parsed = parseGemsRegex(generated, defaultSettings, sampleGems);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.gems.selected).toEqual([1, 2]);
    expect(parsed!.settings.gems.levelEnabled).toBe(true);
    expect(parsed!.settings.gems.levelMin).toBe("20");
    expect(parsed!.settings.gems.levelMax).toBe("21");
    expect(parsed!.settings.gems.qualityEnabled).toBe(true);
    expect(parsed!.settings.gems.qualityMin).toBe("20");
    expect(parsed!.settings.gems.qualityMax).toBe("23");
    expect(generateGemsRegex(parsed!.settings.gems, sampleGems)).toBe(generated);
  });

  it("round-trips PoE 1 Ultimatum regexes", () => {
    const ultimatumSettings: SavedSettings["ultimatum"] = {
      avoidModifiers: ["Ruin"],
      rewards: ["DoubleCurrency"],
      sacrifices: ["DivineOrb"],
    };
    const generated = generateUltimatumRegex(ultimatumSettings, sampleUltimatum);
    const parsed = parseUltimatumRegex(generated, defaultSettings, sampleUltimatum);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.ultimatum.avoidModifiers).toEqual(["Ruin"]);
    expect(parsed!.settings.ultimatum.sacrifices).toEqual(["DivineOrb"]);
  });

  it("parses PoE 1 Heist regexes", () => {
    const parsed = parseHeistRegex("dece|erc.*[12]|ounte.*[1-3]", defaultSettings);
    expect(parsed).not.toBeNull();
    const deception = parsed!.settings.heist.contractLevels.find((c) => c.type.name === "Deception");
    const perception = parsed!.settings.heist.contractLevels.find((c) => c.type.name === "Perception");
    const counter = parsed!.settings.heist.contractLevels.find((c) => c.type.name === "Counter-Thaumaturgy");
    expect(deception?.start).toBe(1);
    expect(deception?.end).toBe(5);
    expect(perception?.start).toBe(1);
    expect(perception?.end).toBe(2);
    expect(counter?.start).toBe(1);
    expect(counter?.end).toBe(3);
  });

  it("auto-detects the correct target page from a regex", () => {
    const catalogs = {mapMods: sampleMapMods, gems: sampleGems, ultimatum: sampleUltimatum};
    const mapCandidates = parsePoe1RegexCandidates('"!reflect" "as d.*([89].|\\d..)%"', defaultSettings, catalogs);
    expect(mapCandidates[0]?.pageKey).toBe("maps");

    const vendorCandidates = parsePoe1RegexCandidates("r-r-g|g-r-r|r-g-r|Runn", defaultSettings, catalogs);
    expect(vendorCandidates[0]?.pageKey).toBe("vendor");

    const gemCandidates = parsePoe1RegexCandidates('"^fireb|ty su" "level: 2[0-1]"', defaultSettings, catalogs);
    expect(gemCandidates[0]?.pageKey).toBe("gems");
  });
});
