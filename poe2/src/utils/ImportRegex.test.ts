import {describe, expect, it} from "vitest";
import {defaultSettings, GroupCondition, Settings} from "../settings";
import {generateWaystoneRegex} from "../pages/waystone/WaystoneResult";
import {generateVendorGroupRegex} from "../pages/vendor/VendorResult";
import {generateTabletRegex} from "../pages/tablet/TabletResult";
import {generateRelicResult} from "../pages/relic/RelicResult";
import {parseAffixToken} from "./parseAffixToken";
import {
  parsePoe2RegexCandidates,
  parsePoe2VendorRegex,
  parseRelicRegex,
  parseTabletRegex,
  parseWaystoneRegex,
} from "./ImportRegex";
import enTabletJson from "../../public/generated/tablet/Generated.Tablet.ENGLISH.min.json";
import ruTabletJson from "../../public/generated/tablet/Generated.Tablet.RUSSIAN.min.json";
import thTabletJson from "../../public/generated/tablet/Generated.Tablet.THAI.min.json";
import enWaystoneJson from "../../public/generated/waystone/Generated.Waystone.ENGLISH.min.json";
import ruWaystoneJson from "../../public/generated/waystone/Generated.Waystone.RUSSIAN.min.json";
import thWaystoneJson from "../../public/generated/waystone/Generated.Waystone.THAI.min.json";
import frWaystoneJson from "../../public/generated/waystone/Generated.Waystone.FRENCH.min.json";
import koWaystoneJson from "../../public/generated/waystone/Generated.Waystone.KOREAN.min.json";
import enRelicJson from "../../public/generated/relic/Generated.Relic.ENGLISH.min.json";
import type {WaystoneAffix, TabletAffix} from "./loadData";
import type {TabletRegex} from "@shared/typedefs/poe2/Tablet";
import type {WaystoneRegex} from "@shared/typedefs/poe2/Waystone";
import type {RelicRegex} from "@shared/typedefs/poe2/Relic";
import type {Language} from "@shared/typedefs/Language";

const tabletCatalogs: Partial<Record<Language, TabletRegex>> = {
  ENGLISH: enTabletJson as unknown as TabletRegex,
  RUSSIAN: ruTabletJson as unknown as TabletRegex,
  THAI: thTabletJson as unknown as TabletRegex,
};

const waystoneCatalogs: Partial<Record<Language, WaystoneRegex>> = {
  ENGLISH: enWaystoneJson as unknown as WaystoneRegex,
  RUSSIAN: ruWaystoneJson as unknown as WaystoneRegex,
  THAI: thWaystoneJson as unknown as WaystoneRegex,
  FRENCH: frWaystoneJson as unknown as WaystoneRegex,
  KOREAN: koWaystoneJson as unknown as WaystoneRegex,
};

const loadGeneratedTabletAffixes = (lang: Language): TabletAffix[] => {
  const {tokens} = tabletCatalogs[lang]!;
  return tokens.map((token, sourceIndex) => ({...parseAffixToken(token), sourceIndex})).sort((a, b) => a.name.localeCompare(b.name));
};

const loadGeneratedWaystoneAffixes = (lang: Language): WaystoneAffix[] => {
  const {tokens} = waystoneCatalogs[lang]!;
  return tokens
    .map((token, sourceIndex) => ({...parseAffixToken(token), sourceIndex, prefix: token.options.prefix}))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const loadGeneratedRelics = (_lang: Language): RelicRegex[] => enRelicJson as unknown as RelicRegex[];

describe("PoE 2 Regex Import", () => {
  it("preserves numeric values on Thai and Russian tablet affixes that share a regex between # and ## variants", () => {
    const thaiAffixes = loadGeneratedTabletAffixes("THAI");
    const russianAffixes = loadGeneratedTabletAffixes("RUSSIAN");

    const parsedThai = parseTabletRegex('"[1-2]\\(.*ตน"', {...defaultSettings, language: "THAI"}, thaiAffixes);
    expect(parsedThai).not.toBeNull();
    expect(parsedThai!.settings.tablet.modifier.affixes[0]?.id).toBe(881965784);
    expect(parsedThai!.settings.tablet.modifier.affixes[0]?.value).toBe(1);
    expect(generateTabletRegex(parsedThai!.settings)).toBe('"[1-2]\\(.*ตน"');

    const parsedRu = parseTabletRegex('"ри:.*[1-2]\\("', {...defaultSettings, language: "RUSSIAN"}, russianAffixes);
    expect(parsedRu).not.toBeNull();
    expect(parsedRu!.settings.tablet.modifier.affixes[0]?.id).toBe(881965784);
    expect(parsedRu!.settings.tablet.modifier.affixes[0]?.value).toBe(1);
    expect(generateTabletRegex(parsedRu!.settings)).toBe('"ри:.*[1-2]\\("');
  });

  it("round-trips Waystone regexes across English, Russian, Thai, French and Korean", () => {
    for (const lang of ["ENGLISH", "RUSSIAN", "THAI", "FRENCH", "KOREAN"] as const) {
      const affixes = loadGeneratedWaystoneAffixes(lang);
      const rangedAffix = affixes.find((a) => a.ranges[0] && a.ranges[0][1] > a.ranges[0][0]) ?? affixes[0];
      const settings: Settings = {
        ...structuredClone(defaultSettings),
        language: lang,
        waystone: {
          ...structuredClone(defaultSettings.waystone),
          rarity: {normal: false, magic: true, rare: true},
          tier: {min: 14, max: 16},
          revives: {min: 2, max: 4},
          state: {corrupted: true, uncorrupted: false, delirious: true},
          itemRarity: "50",
          packSize: "20",
          modifier: {
            round10: false,
            wantedModsSelectType: "any",
            wantedMods: [
              {
                id: rangedAffix.id,
                name: rangedAffix.name,
                regex: rangedAffix.regex,
                ranges: rangedAffix.ranges,
                isSelected: true,
                value: rangedAffix.ranges[0]?.[0] ?? null,
              },
            ],
            unwantedMods: [
              {
                id: affixes[1].id,
                name: affixes[1].name,
                regex: affixes[1].regex,
                ranges: affixes[1].ranges,
                isSelected: true,
                value: null,
              },
            ],
          },
          asyncPriceRange: {
            min: "1",
            max: "25",
            currency: "exalted",
            enabled: true,
            tradeEnabled: false,
          },
        },
      };

      const generated = generateWaystoneRegex(settings);
      const parsed = parseWaystoneRegex(generated, {...defaultSettings, language: lang}, affixes);
      expect(parsed).not.toBeNull();
      expect(generateWaystoneRegex(parsed!.settings)).toBe(generated);
    }
  });

  it("round-trips PoE 2 Vendor regexes with OR and AND groups, levels, mods and custom text", () => {
    const vendorSettings: Settings["vendor"] = {
      selectedGroupId: 0,
      resultSettings: {customText: '"^com"', autoCopy: false, customTextEnabled: true},
      vendorGroups: [
        {
          ...structuredClone(defaultSettings.vendor.vendorGroups[0]),
          condition: GroupCondition.AND,
          itemType: {rare: true, magic: true, normal: false},
          itemProperty: {quality: true, sockets: false},
          itemLevel: {min: "80", max: ""},
          resistances: {fire: true, cold: true, lightning: false, chaos: false},
          movementSpeed: {move30: true, move25: true, move20: false, move15: false, move10: false},
          itemMods: {
            ...structuredClone(defaultSettings.vendor.vendorGroups[0].itemMods),
            skillLevelChaos: true,
            spirit: true,
            strength: true,
            intelligence: true,
          },
          itemClass: {
            ...structuredClone(defaultSettings.vendor.vendorGroups[0].itemClass),
            wands: true,
            sceptres: true,
          },
        },
      ],
    };

    const generated = generateVendorGroupRegex(vendorSettings);
    const parsed = parsePoe2VendorRegex(generated, defaultSettings);
    expect(parsed).not.toBeNull();
    expect(generateVendorGroupRegex(parsed!.settings.vendor)).toBe(generated);
  });

  it("round-trips PoE 2 Relic regexes with real generated data", () => {
    const relics = loadGeneratedRelics("ENGLISH");
    const prefix = relics.find((r) => r.affix === "PREFIX" && r.ranges[0])!;
    const suffix = relics.find((r) => r.affix === "SUFFIX" && r.ranges[0])!;
    const settings: Settings = {
      ...structuredClone(defaultSettings),
      relic: {
        resultSettings: {customText: "", autoCopy: false, customTextEnabled: false},
        matchType: "both",
        modifier: {
          prefixes: [{...prefix, isSelected: true, value: prefix.ranges[0][0]}],
          suffixes: [{...suffix, isSelected: true, value: suffix.ranges[0][0]}],
        },
      },
    };

    const generated = generateRelicResult(settings);
    const parsed = parseRelicRegex(generated, defaultSettings, relics);
    expect(parsed).not.toBeNull();
    expect(generateRelicResult(parsed!.settings)).toBe(generated);
  });

  it("auto-detects the correct PoE 2 page and uses currentPath as tie-breaker", () => {
    const catalogs = {
      waystoneAffixes: loadGeneratedWaystoneAffixes("ENGLISH"),
      tabletAffixes: loadGeneratedTabletAffixes("ENGLISH"),
      relicAffixes: loadGeneratedRelics("ENGLISH"),
    };

    const waystoneCandidates = parsePoe2RegexCandidates('"er 1[456]\\)" "le: [2-4]"', defaultSettings, catalogs);
    expect(waystoneCandidates[0]?.pageKey).toBe("waystone");

    const tabletCandidates = parsePoe2RegexCandidates('"(tual|eac)" "([5-9]|1[0-8]) us"', defaultSettings, catalogs);
    expect(tabletCandidates[0]?.pageKey).toBe("tablet");

    const onTabletPage = parsePoe2RegexCandidates('"y: r"', defaultSettings, catalogs, "/tablet");
    expect(onTabletPage[0]?.pageKey).toBe("tablet");
  });
});
