import {describe, expect, test} from "vitest";
import {generateBoundedValueRegex} from "@shared/core/regex/GenerateNumberRegex";
import {generateMagicItemRegex, generateRareItemRegex} from "./ItemOutput";
import {SelectedMagicMod} from "@shared/core/item/MagicItemSelect";
import type {ItemAffixRegex} from "@shared/typedefs/Item";
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
  start: 0, end: 0, disabled: [], before: [], on: [], after: [],
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

describe("generateRareItemRegex with mods that display a decimal value (#264)", () => {
  const generate = (affix: ItemAffixRegex, values: Record<number, string> = {}) =>
    generateRareItemRegex({"Test Bases-prefix-Test modifier": affix}, settings(values));
  const matcher = (result: string) => new RegExp(result.replace(/^"|"$/g, ""), "i");

  // The value range in the affix names is fractional: "(2.1-8) Life per second"
  const lifeRegen = modifier({
    regex: "te \\d+ l",
    on: [0],
    stats: [{id: "base_life_regeneration_rate_per_minute", min: 60, max: 10560, numberIndex: 0, hasRange: true}],
    affixes: [
      {name: "Regenerate (1-2) Life per second", desc: "of the Newt"},
      {name: "Regenerate (2.1-8) Life per second", desc: "of the Lizard"},
    ],
  });

  test("matches a decimal value above the minimum", () => {
    const regex = matcher(generate(lifeRegen, {0: "90"}));
    expect(regex.test("Regenerate 127.7(96.1-128) Life per second")).toBe(true);
    expect(regex.test("Regenerate 127(96.1-128) Life per second")).toBe(true);
  });

  test("does not match a decimal value below the minimum", () => {
    expect(matcher(generate(lifeRegen, {0: "90"})).test("Regenerate 89.9(64.1-96) Life per second")).toBe(false);
  });

  test("matches a decimal value when no minimum is set", () => {
    expect(matcher(generate(lifeRegen)).test("Regenerate 127.7 Life per second")).toBe(true);
  });

  test("matches a decimal value when only the per minute stat reveals it", () => {
    // Every tier range ends on a whole number, but 540-1200 per minute rolls like 625 show up as "10.4"
    const abyssLifeRegen = modifier({
      regex: "^regenerate \\d+ l",
      on: [0],
      stats: [{id: "base_life_regeneration_rate_per_minute", min: 540, max: 1200, numberIndex: 0, hasRange: true}],
      affixes: [
        {name: "Regenerate (9-12) Life per second", desc: "Youthful"},
        {name: "Regenerate (17-20) Life per second", desc: "Vivacious"},
      ],
    });
    expect(matcher(generate(abyssLifeRegen)).test("Regenerate 10.4 Life per second")).toBe(true);
  });

  test("leaves mods with whole number values unchanged", () => {
    const penetration = modifier({
      regex: "s \\d+% e",
      on: [0],
      stats: [{id: "reduce_enemy_elemental_resistance_%", min: 4, max: 6, numberIndex: 0, hasRange: false}],
      affixes: [{name: "Damage Penetrates 4% Elemental Resistances", desc: "The Shaper's"}],
    });
    expect(generate(penetration, {0: "5"})).toBe(`"s ${generateBoundedValueRegex("5", "6", false)}[^ ]+% e"`);
    expect(generate(penetration)).toBe(`"s \\d+% e"`);
  });

  test("leaves a per minute stat without a range unchanged", () => {
    // 60 per minute is always exactly "1%"
    const fixedLifeRegen = modifier({
      regex: "^regenerate \\d+%",
      on: [0],
      stats: [{id: "life_regeneration_rate_per_minute_%", min: 60, max: 60, numberIndex: 0, hasRange: false}],
      affixes: [{name: "Regenerate 1% of Life per second", desc: "of the Underground"}],
    });
    expect(generate(fixedLifeRegen)).toBe(`"^regenerate \\d+%"`);
  });
});

describe("generateMagicItemRegex with synthesised items (#406)", () => {
  const jewel = {baseType: "Abyss Jewels", item: "Murderous Eye Jewel", rarity: "Magic" as const};
  const sapphire: SelectedMagicMod = {basetype: "Abyss Jewels", category: "prefix", affix: "PREFIX",
    regex: {name: "+(32-34) to maximum Mana", desc: "Sapphire"}, desc: "Sapphire"};
  const ofSin: SelectedMagicMod = {basetype: "Abyss Jewels", category: "suffix", affix: "SUFFIX",
    regex: {name: "Adds (10-11) to (18-21) Chaos Damage to Attacks", desc: "of Sin"}, desc: "of Sin"};

  const generate = (mods: SelectedMagicMod[], onlyIfBothPrefixAndSuffix: boolean, matchOpenAffix: boolean) =>
    generateMagicItemRegex({
      ...settings({}),
      itembase: jewel,
      matchSimilarBases: false,
      selectedMagicMods: mods,
      magicSettings: {onlyIfBothPrefixAndSuffix, matchOpenAffix},
    }, [], true);
  // The in-game search: every quoted term has to match a line of the item
  const matches = (regex: string, name: string) => [...regex.matchAll(/"([^"]*)"/g)]
    .every(([, term]) => ["Rarity: Magic", name, "Synthesised Item"].some((line) => new RegExp(term, "i").test(line)));

  test("matches the prefix of a synthesised item", () => {
    const regex = generate([sapphire], false, false);
    expect(matches(regex, "Synthesised Sapphire Murderous Eye Jewel of Sin")).toBe(true);
    expect(matches(regex, "Sapphire Murderous Eye Jewel of Sin")).toBe(true);
    expect(matches(regex, "Synthesised Azure Murderous Eye Jewel of Sin")).toBe(false);
  });

  test("matches a synthesised item with both affixes or an open prefix", () => {
    const regex = generate([sapphire, ofSin], true, true);
    expect(matches(regex, "Synthesised Sapphire Murderous Eye Jewel of Sin")).toBe(true);
    expect(matches(regex, "Synthesised Murderous Eye Jewel of Sin")).toBe(true);
    expect(matches(regex, "Synthesised Azure Murderous Eye Jewel of Sin")).toBe(false);
    expect(matches(regex, "Sapphire Murderous Eye Jewel of Sin")).toBe(true);
  });

  test("matches an open prefix on a synthesised item", () => {
    const regex = generate([sapphire], false, true);
    expect(matches(regex, "Synthesised Murderous Eye Jewel of Sin")).toBe(true);
  });

  test("leaves the regex unchanged when not asked to match synthesised items", () => {
    expect(generateMagicItemRegex({...settings({}), itembase: jewel, selectedMagicMods: [sapphire]}, []))
      .toBe(`"^Sapphire"`);
  });
});
