import {describe, expect, it} from "vitest";
import {defaultSettings, GroupCondition, Settings} from "../settings";
import {generateWaystoneRegex} from "../pages/waystone/WaystoneResult";
import {generateVendorGroupRegex} from "../pages/vendor/VendorResult";
import {generateTabletRegex} from "../pages/tablet/TabletResult";
import {generateRelicResult} from "../pages/relic/RelicResult";
import {
  parsePoe2RegexCandidates,
  parsePoe2VendorRegex,
  parseRelicRegex,
  parseTabletRegex,
  parseWaystoneRegex,
} from "./ImportRegex";
import type {WaystoneAffix, TabletAffix} from "./loadData";
import type {RelicRegex} from "@shared/typedefs/poe2/Relic";

const sampleWaystoneAffixes: WaystoneAffix[] = [
  {
    id: 1,
    name: "##% increased Monster Damage",
    regex: "r dam",
    values: [],
    ranges: [[20, 40]],
    prefix: true,
    sourceIndex: 0,
  },
  {
    id: 2,
    name: "Players are Cursed with Temporal Chains",
    regex: "ral c",
    values: [],
    ranges: [],
    prefix: false,
    sourceIndex: 1,
  },
];

const sampleTabletAffixes: TabletAffix[] = [
  {
    id: 10,
    name: "##% increased Pack Size in Map",
    regex: "pack",
    values: [],
    ranges: [[5, 30]],
    sourceIndex: 0,
  },
];

const sampleRelicAffixes: RelicRegex[] = [
  {
    id: 1,
    affix: "PREFIX",
    name: "Bosses take #% increased Damage",
    regex: "^bo",
    ranges: [[11, 30]],
    values: [],
  },
  {
    id: 2,
    affix: "SUFFIX",
    name: "#% chance for each of your Keys to upgrade",
    regex: "eac",
    ranges: [[3, 9]],
    values: [],
  },
];

describe("PoE 2 Regex Import", () => {
  it("round-trips Waystone regexes with tier, revives, rarity, state, quantifiers, modifiers and price", () => {
    const settings: Settings = {
      ...structuredClone(defaultSettings),
      waystone: {
        ...structuredClone(defaultSettings.waystone),
        rarity: {normal: false, magic: true, rare: true},
        tier: {min: 14, max: 16},
        revives: {min: 2, max: 4},
        state: {corrupted: true, uncorrupted: false, delirious: true},
        itemRarity: "50",
        packSize: "20",
        waystoneDropChance: "100",
        monsterRarity: "30",
        monsterEffectiveness: "15",
        modifier: {
          round10: false,
          wantedModsSelectType: "any",
          wantedMods: [
            {
              id: 1,
              name: "##% increased Monster Damage",
              regex: "r dam",
              ranges: [[20, 40]],
              isSelected: true,
              value: 25,
            },
          ],
          unwantedMods: [
            {
              id: 2,
              name: "Players are Cursed with Temporal Chains",
              regex: "ral c",
              ranges: [],
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
    const parsed = parseWaystoneRegex(generated, defaultSettings, sampleWaystoneAffixes);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.waystone.rarity).toEqual({normal: false, magic: true, rare: true});
    expect(parsed!.settings.waystone.tier).toEqual({min: 14, max: 16});
    expect(parsed!.settings.waystone.revives).toEqual({min: 2, max: 4});
    expect(parsed!.settings.waystone.state).toEqual({corrupted: true, uncorrupted: false, delirious: true});
    expect(parsed!.settings.waystone.itemRarity).toBe("50");
    expect(parsed!.settings.waystone.packSize).toBe("20");
    expect(parsed!.settings.waystone.waystoneDropChance).toBe("100");
    expect(parsed!.settings.waystone.monsterRarity).toBe("30");
    expect(parsed!.settings.waystone.monsterEffectiveness).toBe("15");
    expect(parsed!.settings.waystone.modifier.wantedMods[0]?.value).toBe(25);
    expect(parsed!.settings.waystone.modifier.unwantedMods[0]?.regex).toBe("ral c");
    expect(parsed!.settings.waystone.asyncPriceRange).toEqual({
      min: "1",
      max: "25",
      currency: "exalted",
      enabled: true,
      tradeEnabled: false,
    });
    expect(generateWaystoneRegex(parsed!.settings)).toBe(generated);
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

  it("round-trips PoE 2 Tablet regexes", () => {
    const settings: Settings = {
      ...structuredClone(defaultSettings),
      tablet: {
        ...structuredClone(defaultSettings.tablet),
        rarity: {normal: false, magic: true, rare: false},
        type: {
          ...structuredClone(defaultSettings.tablet.type),
          ritual: true,
          breach: true,
        },
        modifier: {
          usesRemaining: true,
          numUsesRemaining: 8,
          round10: false,
          affixSelectType: "any",
          affixes: [
            {
              id: 10,
              name: "##% increased Pack Size in Map",
              regex: "pack",
              ranges: [[5, 30]],
              isSelected: true,
              value: 20,
            },
          ],
        },
        asyncPriceRange: {
          min: "1",
          max: "9",
          currency: "divine",
          enabled: true,
          tradeEnabled: false,
        },
      },
    };

    const generated = generateTabletRegex(settings);
    const parsed = parseTabletRegex(generated, defaultSettings, sampleTabletAffixes);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.tablet.type.ritual).toBe(true);
    expect(parsed!.settings.tablet.type.breach).toBe(true);
    expect(parsed!.settings.tablet.modifier.usesRemaining).toBe(true);
    expect(parsed!.settings.tablet.modifier.numUsesRemaining).toBe(8);
    expect(parsed!.settings.tablet.modifier.affixes[0]?.value).toBe(20);
    expect(generateTabletRegex(parsed!.settings)).toBe(generated);
  });

  it("round-trips PoE 2 Relic regexes", () => {
    const settings: Settings = {
      ...structuredClone(defaultSettings),
      relic: {
        resultSettings: {customText: "", autoCopy: false, customTextEnabled: false},
        matchType: "both",
        modifier: {
          prefixes: [
            {
              name: "Bosses take #% increased Damage",
              regex: "^bo",
              ranges: [[11, 30]],
              isSelected: true,
              value: 15,
            },
          ],
          suffixes: [
            {
              name: "#% chance for each of your Keys to upgrade",
              regex: "eac",
              ranges: [[3, 9]],
              isSelected: true,
              value: 5,
            },
          ],
        },
      },
    };

    const generated = generateRelicResult(settings);
    const parsed = parseRelicRegex(generated, defaultSettings, sampleRelicAffixes);
    expect(parsed).not.toBeNull();
    expect(parsed!.settings.relic.matchType).toBe("both");
    expect(parsed!.settings.relic.modifier.prefixes[0]?.value).toBe(15);
    expect(parsed!.settings.relic.modifier.suffixes[0]?.value).toBe(5);
    expect(generateRelicResult(parsed!.settings)).toBe(generated);
  });

  it("auto-detects the correct PoE 2 page and uses currentPath as tie-breaker", () => {
    const catalogs = {
      waystoneAffixes: sampleWaystoneAffixes,
      tabletAffixes: sampleTabletAffixes,
      relicAffixes: sampleRelicAffixes,
    };

    const waystoneCandidates = parsePoe2RegexCandidates('"er 1[456]\\)" "le: [2-4]"', defaultSettings, catalogs);
    expect(waystoneCandidates[0]?.pageKey).toBe("waystone");

    const tabletCandidates = parsePoe2RegexCandidates('"(tual|eac)" "([5-9]|1[0-8]) us"', defaultSettings, catalogs);
    expect(tabletCandidates[0]?.pageKey).toBe("tablet");

    // Ambiguous rarity token uses currentPath tie-breaker
    const onTabletPage = parsePoe2RegexCandidates('"y: r"', defaultSettings, catalogs, "/tablet");
    expect(onTabletPage[0]?.pageKey).toBe("tablet");
  });
});
