import {describe, expect, test} from "vitest";
import {generateBoundedValueRegex} from "@shared/core/regex/GenerateNumberRegex";
import {generateRareItemRegex} from "./ItemOutput";
import {ItemAffixRegex} from "@shared/types/GeneratedItemMod.Types";
import {ItemCraftingSettings} from "@shared/types/Settings.types";

const itemBase = {
  baseType: "Test Bases",
  item: "Test Base",
  rarity: "Rare" as const,
};

const settings = (values: Record<number, string>): ItemCraftingSettings => ({
  itembase: itemBase,
  matchSimilarBases: true,
  selectedRareMods: {
    "Test Bases-prefix-Test modifier": {
      itembase: itemBase,
      selected: true,
      values,
    },
  },
  selectedMagicMods: [],
  rareSettings: {
    matchAnyMod: false,
    matchPrefixAndSuffix: false,
  },
  magicSettings: {
    onlyIfBothPrefixAndSuffix: false,
    matchOpenAffix: false,
  },
  customText: {
    value: "",
    enabled: false,
  },
});

const modifier = (overrides: Partial<ItemAffixRegex>): ItemAffixRegex => ({
  desc: "Test modifier",
  regex: "damage$",
  start: 0,
  end: 0,
  disabled: [],
  before: [],
  on: [],
  after: [],
  affixtype: "PREFIX",
  stats: [],
  affixes: [],
  ...overrides,
});

describe("generateRareItemRegex", () => {
  test("uses each numeric placeholder's own maximum", () => {
    const affix = modifier({
      before: [0, 1],
      stats: [
        {id: "high", min: 1, max: 71, numberIndex: 1, hasRange: true},
        {id: "low", min: 1, max: 4, numberIndex: 0, hasRange: true},
      ],
    });

    const result = generateRareItemRegex(
      {"Test Bases-prefix-Test modifier": affix},
      settings({0: "2", 1: "50"}),
    );

    const low = generateBoundedValueRegex("2", "4", false);
    const high = generateBoundedValueRegex("50", "71", false);
    expect(result).toBe(`"${low}.*${high}.*damage$"`);
  });

  test("falls back safely when a placeholder has no stat metadata", () => {
    const affix = modifier({
      before: [0, 1],
      stats: [
        {id: "chance", min: 5, max: 12, numberIndex: 0, hasRange: true},
      ],
    });

    const result = generateRareItemRegex(
      {"Test Bases-prefix-Test modifier": affix},
      settings({1: "1"}),
    );

    expect(result).toBe(`"${generateBoundedValueRegex("1", "", false)}.*damage$"`);
  });
});
