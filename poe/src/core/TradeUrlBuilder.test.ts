import {buildTradeQuery, TradeSettings} from "./TradeUrlBuilder";

const baseSettings = (overrides: Partial<TradeSettings> = {}): TradeSettings => ({
  badIds: [],
  goodIds: [],
  allGoodMods: true,
  quantity: "",
  packsize: "",
  itemRarity: "",
  currency: "",
  scarab: "",
  divination: "",
  regex: "",
  eightModOnly: false,
  excludeValdo: false,
  excludeShaperElder: false,
  mapDropChance: "",
  quality: {currency: "", divination: "", scarab: "", rarity: "", packSize: ""},
  anyQuality: false,
  anyYield: false,
  corrupted: {enabled: false, include: true},
  unidentified: {enabled: false, include: true},
  asyncPriceRange: {min: "0", max: "999", currency: "chaos", enabled: false, tradeEnabled: false},
  ...overrides,
});

describe("buildTradeQuery", () => {
  describe("parseMinFilter boundaries (via mapDropChance)", () => {
    test.each([
      ["empty string", ""],
      ["zero", "0"],
      ["negative", "-5"],
      ["non-numeric", "abc"],
    ])("does not emit a stat group for %s", (_label, value) => {
      const q = buildTradeQuery(baseSettings({mapDropChance: value}));
      expect(q.query.stats ?? []).toEqual([]);
    });

    test("positive integer emits a stat group with min", () => {
      const q = buildTradeQuery(baseSettings({mapDropChance: "30"}));
      expect(q.query.stats).toEqual([
        {
          type: "and",
          filters: [{id: "pseudo.pseudo_map_more_map_drops", value: {min: 30}}],
        },
      ]);
    });
  });

  test("uses the Divination Cards yield pseudostat", () => {
    const q = buildTradeQuery(baseSettings({divination: "30"}));
    expect(q.query.stats).toEqual([
      {
        type: "and",
        filters: [{id: "pseudo.pseudo_map_more_card_drops", value: {min: 30}}],
      },
    ]);
  });

  describe("quality + anyQuality group selection", () => {
    test("one quality field with anyQuality=true uses 'and' (not a 1-filter count)", () => {
      const q = buildTradeQuery(
        baseSettings({
          anyQuality: true,
          quality: {currency: "5", divination: "", scarab: "", rarity: "", packSize: ""},
        }),
      );
      expect(q.query.stats).toEqual([
        {
          type: "and",
          filters: [{id: "pseudo.pseudo_map_quality_currency", value: {min: 5}}],
        },
      ]);
    });

    test("multiple quality fields with anyQuality=true use 'count' min:1", () => {
      const q = buildTradeQuery(
        baseSettings({
          anyQuality: true,
          quality: {currency: "5", divination: "3", scarab: "", rarity: "", packSize: ""},
        }),
      );
      expect(q.query.stats).toEqual([
        {
          type: "count",
          filters: [
            {id: "pseudo.pseudo_map_quality_currency", value: {min: 5}},
            {id: "pseudo.pseudo_map_quality_cards", value: {min: 3}},
          ],
          value: {min: 1},
        },
      ]);
    });

    test("multiple quality fields with anyQuality=false use 'and'", () => {
      const q = buildTradeQuery(
        baseSettings({
          anyQuality: false,
          quality: {currency: "5", divination: "3", scarab: "", rarity: "", packSize: ""},
        }),
      );
      expect(q.query.stats).toEqual([
        {
          type: "and",
          filters: [
            {id: "pseudo.pseudo_map_quality_currency", value: {min: 5}},
            {id: "pseudo.pseudo_map_quality_cards", value: {min: 3}},
          ],
        },
      ]);
    });
  });

  describe("unidentified.include inversion", () => {
    test("enabled + include=true emits identified='false' (show only unidentified)", () => {
      const q = buildTradeQuery(baseSettings({unidentified: {enabled: true, include: true}}));
      expect(q.query.filters.misc_filters?.filters.identified).toEqual({option: "false"});
    });

    test("enabled + include=false emits identified='true' (show only identified)", () => {
      const q = buildTradeQuery(baseSettings({unidentified: {enabled: true, include: false}}));
      expect(q.query.filters.misc_filters?.filters.identified).toEqual({option: "true"});
    });

    test("disabled emits no identified key (and no misc_filters block at all)", () => {
      const q = buildTradeQuery(baseSettings({unidentified: {enabled: false, include: true}}));
      expect(q.query.filters.misc_filters).toBeUndefined();
    });
  });

  test("misc_filters merges corrupted, unidentified, and excludeValdo", () => {
    const q = buildTradeQuery(
      baseSettings({
        corrupted: {enabled: true, include: false},
        unidentified: {enabled: true, include: false},
        excludeValdo: true,
      }),
    );
    expect(q.query.filters.misc_filters).toEqual({
      disabled: false,
      filters: {
        corrupted: {option: "false"},
        identified: {option: "true"},
        foil_variation: {option: "none"},
      },
    });
  });

  describe("when using more currency setting", () => {
    test("it should translate to pseudo more currency", () => {
      const q = buildTradeQuery(baseSettings({currency: "80"}));
      expect(q.query.stats).toEqual([
        {
          type: "and",
          filters: [{id: "pseudo.pseudo_map_more_currency_drops", value: {min: 80}}],
        },
      ]);
    })
  })

  describe("async trade price range", () => {
    test.each(["chaos", "divine"] as const)("adds a %s price filter", (currency) => {
      const q = buildTradeQuery(baseSettings({
        asyncPriceRange: {min: "1", max: "25", currency, enabled: false, tradeEnabled: true},
      }));
      expect(q.query.filters.trade_filters).toEqual({
        filters: {price: {option: currency, min: 1, max: 25}},
      });
    });

    test("does not add a price filter when disabled", () => {
      const q = buildTradeQuery(baseSettings());
      expect(q.query.filters.trade_filters).toBeUndefined();
    });

    test("uses slider limits for empty endpoints", () => {
      const q = buildTradeQuery(baseSettings({
        asyncPriceRange: {min: "", max: "", currency: "chaos", enabled: false, tradeEnabled: true},
      }));
      expect(q.query.filters.trade_filters?.filters.price).toEqual({
        option: "chaos",
        min: 0,
        max: 999,
      });
    });
  });
});
