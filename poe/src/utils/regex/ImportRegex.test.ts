import {describe, expect, it} from "vitest";
import {defaultSettings, MapSettings, SavedSettings} from "../SavedSettings";
import {generateMapModRegex} from "@poe/pages/maps/OptimizedMapOutput";
import {generateResultString} from "../OutputString";
import {generateGemsRegex} from "@poe/pages/gems/GemsOutput";
import {
  parseGemsRegex,
  parseHeistRegex,
  parseMapRegex,
  parsePoe1RegexCandidates,
  parseVendorRegex,
} from "./ImportRegex";
import enMapJson from "../../../public/generated/mapmods/Generated.Map.ENGLISH.min.json";
import ruMapJson from "../../../public/generated/mapmods/Generated.Map.RUSSIAN.min.json";
import thMapJson from "../../../public/generated/mapmods/Generated.Map.THAI.min.json";
import frMapJson from "../../../public/generated/mapmods/Generated.Map.FRENCH.min.json";
import koMapJson from "../../../public/generated/mapmods/Generated.Map.KOREAN.min.json";
import enGemsJson from "../../../public/generated/gems/Generated.Gems.ENGLISH.min.json";
import type {MapModsRegex} from "@shared/typedefs/poe1/MapMods";
import type {GemsRegex} from "@shared/typedefs/poe1/Gems";
import type {Language} from "@shared/typedefs/Language";

const mapCatalogs: Partial<Record<Language, MapModsRegex>> = {
  ENGLISH: enMapJson as unknown as MapModsRegex,
  RUSSIAN: ruMapJson as unknown as MapModsRegex,
  THAI: thMapJson as unknown as MapModsRegex,
  FRENCH: frMapJson as unknown as MapModsRegex,
  KOREAN: koMapJson as unknown as MapModsRegex,
};

const loadGeneratedMapMods = (lang: Language): MapModsRegex => mapCatalogs[lang]!;
const loadGeneratedGems = (_lang: Language): GemsRegex => enGemsJson as unknown as GemsRegex;

describe("PoE 1 Regex Import", () => {
  it("does not select extra mods when a wanted mod shares text with an optimizationTable entry ('ter e')", () => {
    const enMaps = loadGeneratedMapMods("ENGLISH");
    const chaosResMod = enMaps.tokens.find((t) => t.regex === "ter e")!;
    const settings: MapSettings = {
      ...structuredClone(defaultSettings.map),
      goodIds: [chaosResMod.id],
      allGoodMods: true,
    };

    const generated = generateMapModRegex(settings, enMaps, "ENGLISH");
    expect(generated).toBe('"ter e"');

    const parsed = parseMapRegex(generated, defaultSettings, enMaps);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.map.goodIds).toEqual([chaosResMod.id]);
    expect(generateMapModRegex(parsed!.settings.map, enMaps, "ENGLISH")).toBe('"ter e"');
  });

  it("recovers 'Match any' vs 'Match all' for a single wanted mod without spaces ('cco' vs '\"cco\"')", () => {
    const enMaps = loadGeneratedMapMods("ENGLISH");
    const mod = enMaps.tokens.find((t) => t.regex === "cco")!;

    const matchAllSettings: MapSettings = {...structuredClone(defaultSettings.map), goodIds: [mod.id], allGoodMods: true};
    const matchAllRegex = generateMapModRegex(matchAllSettings, enMaps, "ENGLISH");
    expect(matchAllRegex).toBe("cco");
    const parsedAll = parseMapRegex(matchAllRegex, defaultSettings, enMaps)!;
    expect(parsedAll.settings.map.allGoodMods).toBe(true);
    expect(generateMapModRegex(parsedAll.settings.map, enMaps, "ENGLISH")).toBe("cco");

    const matchAnySettings: MapSettings = {...structuredClone(defaultSettings.map), goodIds: [mod.id], allGoodMods: false};
    const matchAnyRegex = generateMapModRegex(matchAnySettings, enMaps, "ENGLISH");
    expect(matchAnyRegex).toBe('"cco"');
    const parsedAny = parseMapRegex(matchAnyRegex, defaultSettings, enMaps)!;
    expect(parsedAny.settings.map.allGoodMods).toBe(false);
    expect(generateMapModRegex(parsedAny.settings.map, enMaps, "ENGLISH")).toBe('"cco"');
  });

  it("does not guess mods for arbitrary text, wildcards or ReDoS patterns, and does not alter exact number meaning", () => {
    const enMaps = loadGeneratedMapMods("ENGLISH");
    const enGems = loadGeneratedGems("ENGLISH");
    const catalogs = {mapMods: enMaps, gems: enGems};

    expect(parsePoe1RegexCandidates('"!.*"', defaultSettings, catalogs)).toEqual([]);
    expect(parsePoe1RegexCandidates('"!mon"', defaultSettings, catalogs)).toEqual([]);
    expect(parsePoe1RegexCandidates("my notes here", defaultSettings, catalogs)).toEqual([]);

    const start = performance.now();
    expect(parsePoe1RegexCandidates('"!(.*.*)*zq9"', defaultSettings, catalogs)).toEqual([]);
    expect(performance.now() - start).toBeLessThan(100);

    // "as d.*80%" is exact 80%, not >=80%, so it must not be turned into quantity="80"
    expect(parsePoe1RegexCandidates('"as d.*80%"', defaultSettings, catalogs)).toEqual([]);
  });

  it("imports single unquoted gems whose regex contains a space ('al pe', 'ty su') as Gems, not Map mods", () => {
    const enMaps = loadGeneratedMapMods("ENGLISH");
    const enGems = loadGeneratedGems("ENGLISH");
    const catalogs = {mapMods: enMaps, gems: enGems};

    for (const gem of enGems.tokens.filter((g) => g.regex.includes(" ")).slice(0, 20)) {
      const settings: SavedSettings["gems"] = {...structuredClone(defaultSettings.gems), selected: [gem.id]};
      const generated = generateGemsRegex(settings, enGems);
      const candidates = parsePoe1RegexCandidates(generated, defaultSettings, catalogs);
      expect(candidates[0]?.pageKey).toBe("gems");
      expect(candidates[0]?.settings.gems.selected).toEqual([gem.id]);
      expect(generateGemsRegex(candidates[0]!.settings.gems, enGems)).toBe(generated);
    }
  });

  it("round-trips generated Map Mods regexes across English, Russian, Thai, French and Korean", () => {
    for (const lang of ["ENGLISH", "RUSSIAN", "THAI", "FRENCH", "KOREAN"] as const) {
      const mapMods = loadGeneratedMapMods(lang);
      const nonNmTokens = mapMods.tokens.filter((t) => !t.options.nm);
      for (let i = 0; i < 40; i++) {
        const badCount = 1 + (i % 6);
        const goodCount = i % 3;
        const badIds = nonNmTokens.slice(i, i + badCount).map((t) => t.id);
        const goodIds = nonNmTokens.slice(i + badCount, i + badCount + goodCount).map((t) => t.id);
        const settings: MapSettings = {
          ...structuredClone(defaultSettings.map),
          badIds,
          goodIds,
          allGoodMods: i % 2 === 0,
          quantity: i % 3 === 0 ? "80" : "",
          packsize: i % 4 === 0 ? "25" : "",
        };
        const base: SavedSettings = {...defaultSettings, language: lang};
        const generated = generateMapModRegex(settings, mapMods, lang);
        const parsed = parseMapRegex(generated, base, mapMods);
        expect(parsed).not.toBeNull();
        expect(generateMapModRegex(parsed!.settings.map, mapMods, lang)).toBe(generated);
      }
    }
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

  it("round-trips PoE 1 Gems regexes with level and quality ranges", () => {
    const enGems = loadGeneratedGems("ENGLISH");
    const gemsSettings: SavedSettings["gems"] = {
      ...structuredClone(defaultSettings.gems),
      selected: [enGems.tokens[0].id, enGems.tokens[1].id],
      levelEnabled: true,
      levelMin: "20",
      levelMax: "21",
      qualityEnabled: true,
      qualityMin: "20",
      qualityMax: "23",
    };

    const generated = generateGemsRegex(gemsSettings, enGems);
    const parsed = parseGemsRegex(generated, defaultSettings, enGems);
    expect(parsed).not.toBeNull();
    expect(generateGemsRegex(parsed!.settings.gems, enGems)).toBe(generated);
  });

  it("parses PoE 1 Heist regexes", () => {
    const parsed = parseHeistRegex("dece|erc.*[12]|ounte.*[1-3]", defaultSettings);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.heist.contractLevels.find((c) => c.type.name === "Deception")?.end).toBe(5);
    expect(parsed!.settings.heist.contractLevels.find((c) => c.type.name === "Perception")?.end).toBe(2);
    expect(parsed!.settings.heist.contractLevels.find((c) => c.type.name === "Counter-Thaumaturgy")?.end).toBe(3);
  });
});
