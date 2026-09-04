import {defaultSettings, GroupCondition, Settings, VendorGroup} from "../settings";
import {generateVendorGroupRegex, generateVendorRegex} from "./vendor/VendorResult";
import {generateWaystoneRegex} from "./waystone/WaystoneResult";
import {generateTabletRegex} from "./tablet/TabletResult";
import {generateRelicResult} from "./relic/RelicResult";
import {buildTabletQuery, buildWaystoneQuery} from "../utils/TradeUrlBuilder";

const vendorGroup = (overrides: Partial<VendorGroup> = {}): VendorGroup => ({
  ...defaultSettings.vendor.vendorGroups[0],
  ...overrides,
});

const fullSettings = (overrides: Partial<Settings> = {}): Settings => ({
  ...defaultSettings,
  ...overrides,
});

describe("poe2 generateVendorRegex", () => {
  test("single condition produces one quoted term", () => {
    const g = vendorGroup({itemType: {rare: true, magic: false, normal: false}});
    expect(generateVendorRegex(g)).toBe(`"y: r"`);
  });

  test("OR condition joins terms with | inside one quoted group", () => {
    const g = vendorGroup({
      condition: GroupCondition.OR,
      itemType: {rare: true, magic: true, normal: false},
      resistances: {fire: true, cold: false, lightning: false, chaos: false},
    });
    expect(generateVendorRegex(g)).toBe(`"y: (r|m)|fi.+res"`);
  });

  test("AND condition emits each term as its own quoted group", () => {
    const g = vendorGroup({
      condition: GroupCondition.AND,
      itemType: {rare: true, magic: true, normal: false},
      resistances: {fire: true, cold: false, lightning: false, chaos: false},
    });
    expect(generateVendorRegex(g)).toBe(`"y: (r|m)" "fi.+res"`);
  });

  test("empty group returns empty string", () => {
    expect(generateVendorRegex(vendorGroup())).toBe("");
  });

  test("item level range emits level regex", () => {
    const g = vendorGroup({itemLevel: {min: "86", max: ""}});
    expect(generateVendorRegex(g)).toBe(`"m level: (8[6-9]|9[0-9])\\b"`);
  });

  test("chaos spell skill level emits chaos spell skills regex", () => {
    const g = vendorGroup({
      itemMods: {...defaultSettings.vendor.vendorGroups[0].itemMods, skillLevelChaos: true},
    });
    expect(generateVendorRegex(g)).toBe(`"^\\+.*os sp.*ls$"`);
  });

  test("groups are space-joined and custom text appended", () => {
    const settings: Settings["vendor"] = {
      resultSettings: {customText: "\"^com\"", autoCopy: false, customTextEnabled: true},
      selectedGroupId: 0,
      vendorGroups: [
        vendorGroup({itemType: {rare: true, magic: false, normal: false}}),
        vendorGroup({itemType: {rare: false, magic: true, normal: false}}),
      ],
    };
    expect(generateVendorGroupRegex(settings)).toBe(`"y: r" "y: m" "^com"`);
  });
});

describe("poe2 generateWaystoneRegex", () => {
  test("maps pack size to the trade map-pack-size filter", () => {
    const waystone = {...defaultSettings.waystone, packSize: "20"};

    expect(buildWaystoneQuery(waystone, {}).query.filters.map_filters)
      .toEqual({disabled: false, filters: {map_packsize: {min: 20}}});
  });

  test("full range tier emits nothing", () => {
    const s = fullSettings();
    expect(generateWaystoneRegex(s)).toBe("");
  });

  test("tier 14-16 only", () => {
    const s = fullSettings({waystone: {...defaultSettings.waystone, tier: {min: 14, max: 16}}});
    expect(generateWaystoneRegex(s)).toBe(`"er 1[456]\\)"`);
  });

  test("revives only", () => {
    const s = fullSettings({waystone: {...defaultSettings.waystone, revives: {min: 2, max: 4}}});
    expect(generateWaystoneRegex(s)).toBe(`"le: [2-4]"`);
  });

  test("corrupted only state", () => {
    const s = fullSettings({
      waystone: {
        ...defaultSettings.waystone,
        state: {corrupted: true, uncorrupted: false, delirious: false},
      },
    });
    expect(generateWaystoneRegex(s)).toBe(`corr`);
  });

  test("rarity rare+magic", () => {
    const s = fullSettings({
      waystone: {
        ...defaultSettings.waystone,
        rarity: {normal: false, magic: true, rare: true},
      },
    });
    expect(generateWaystoneRegex(s)).toBe(`"y: (m|r)"`);
  });

  test("price range uses PoE 2 exalted currency", () => {
    const s = fullSettings({
      waystone: {
        ...defaultSettings.waystone,
        asyncPriceRange: {
          min: "1",
          max: "25",
          currency: "exalted",
          enabled: true,
          tradeEnabled: false,
        },
      },
    });
    expect(generateWaystoneRegex(s)).toBe(`"([1-9]|1[0-9]|2[0-5]) exalted"`);
  });
});

describe("poe2 generateTabletRegex", () => {
  test("includes selected modifier minimum values in trade searches", () => {
    const tablet = {
      ...defaultSettings.tablet,
      modifier: {
        ...defaultSettings.tablet.modifier,
        affixes: [{
          id: 123,
          name: "##% increased Pack Size in Map",
          value: 25,
          isSelected: true,
          ranges: [[5, 30]],
          regex: "pack",
        }],
      },
    };

    expect(buildTabletQuery(tablet, {"123": "explicit.stat_123"}).query.stats)
      .toEqual([{type: "count", filters: [{id: "explicit.stat_123", value: {min: 25}}], value: {min: 1}}]);
  });

  test("price range uses PoE 2 divine currency", () => {
    const s = fullSettings({
      tablet: {
        ...defaultSettings.tablet,
        asyncPriceRange: {
          min: "1",
          max: "9",
          currency: "divine",
          enabled: true,
          tradeEnabled: false,
        },
      },
    });
    expect(generateTabletRegex(s)).toBe(`"[1-9] divine"`);
  });

  test("single tablet type", () => {
    const s = fullSettings({
      tablet: {
        ...defaultSettings.tablet,
        type: {irradiated: false, ritual: true, delirium: false, breach: false, abyss: false, temple: false, overseer: false},
      },
    });
    expect(generateTabletRegex(s)).toBe(`"(tual)"`);
  });

  test("min uses remaining 5", () => {
    const s = fullSettings({
      tablet: {
        ...defaultSettings.tablet,
        modifier: {...defaultSettings.tablet.modifier, usesRemaining: true, numUsesRemaining: 5},
      },
    });
    expect(generateTabletRegex(s)).toBe(`"([5-9]|1[0-8]) us"`);
  });

  test("min uses remaining 14", () => {
    const s = fullSettings({
      tablet: {
        ...defaultSettings.tablet,
        modifier: {...defaultSettings.tablet.modifier, usesRemaining: true, numUsesRemaining: 14},
      },
    });
    expect(generateTabletRegex(s)).toBe(`"(1[4-8]) us"`);
  });
});

describe("poe2 generateRelicResult", () => {
  test("empty relic produces empty string", () => {
    expect(generateRelicResult(fullSettings())).toBe("");
  });

  test("any match type joins prefixes and suffixes with |", () => {
    const s = fullSettings({
      relic: {
        resultSettings: {customText: "", autoCopy: false, customTextEnabled: false},
        matchType: "any",
        modifier: {
          prefixes: [{name: "p", value: null, isSelected: true, ranges: [], regex: "ms"}],
          suffixes: [{name: "s", value: null, isSelected: true, ranges: [], regex: "eac"}],
        },
      },
    });
    expect(generateRelicResult(s)).toBe(`"ms|eac"`);
  });

  test("both match type quotes each group", () => {
    const s = fullSettings({
      relic: {
        resultSettings: {customText: "", autoCopy: false, customTextEnabled: false},
        matchType: "both",
        modifier: {
          prefixes: [{name: "p", value: null, isSelected: true, ranges: [], regex: "ms"}],
          suffixes: [{name: "s", value: null, isSelected: true, ranges: [], regex: "eac"}],
        },
      },
    });
    expect(generateRelicResult(s)).toBe(`"ms" "eac"`);
  });

  test("places a numeric relic filter on the correct side of its generated regex", () => {
    const s = fullSettings({
      relic: {
        resultSettings: {customText: "", autoCopy: false, customTextEnabled: false},
        matchType: "any",
        modifier: {
          prefixes: [
            {name: "Bosses take #% increased Damage", value: 11, isSelected: true, ranges: [[11, 30]], regex: "^bo"},
            {name: "#% chance for each of your Keys to upgrade", value: 3, isSelected: true, ranges: [[3, 9]], regex: "eac"},
          ],
          suffixes: [],
        },
      },
    });

    expect(generateRelicResult(s)).toBe(`"^bo.*(1[1-9]|2\\d|30)\\(|[3-9]\\(.*eac"`);
  });
});
