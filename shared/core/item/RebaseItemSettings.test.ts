import {hasItem, rebaseItemSettings} from "./RebaseItemSettings";
import {itemCraftingDefault} from "@shared/types/Settings.types";
import type {BaseType, ItemAffixRegex, ItemRegex} from "@shared/generated/item";
import type {ItemCraftingSettings} from "@shared/types/Settings.types";

const modifier = (desc: string, affix: string): ItemAffixRegex => ({
  desc, regex: desc, start: 0, end: 0, disabled: [], before: [], on: [], after: [],
  affixtype: "PREFIX", stats: [], affixes: [{name: affix, desc}],
});

const englishBases: BaseType[] = [
  {name: "Body Armours", items: ["Plate Vest", "Vaal Regalia"]},
  {name: "Rings", items: ["Iron Ring", "Gold Ring"]},
];
const germanBases: BaseType[] = [
  {name: "Body Armours", items: ["Plattenweste", "Vaal-Regalia"]},
  {name: "Rings", items: ["Eisenring", "Goldring"]},
];
const englishRegex: ItemRegex[] = [
  {basetype: "Body Armours", categoryRegex: [{category: "int_armour", warnings: [], modifiers: [
    modifier("+# to maximum Life", "Healthy"), modifier("#% increased Energy Shield", "Shining")]}]},
  {basetype: "Rings", categoryRegex: [{category: "ring", warnings: [], modifiers: [
    modifier("+#% to Fire Resistance", "of the Whelpling")]}]},
];
const germanRegex: ItemRegex[] = [
  {basetype: "Body Armours", categoryRegex: [{category: "int_armour", warnings: [], modifiers: [
    modifier("+# zu maximalem Leben", "Gesunde"), modifier("#% erhöhter Energieschild", "Glänzende")]}]},
  {basetype: "Rings", categoryRegex: [{category: "ring", warnings: [], modifiers: [
    modifier("+#% zu Feuerwiderstand", "des Welpen")]}]},
];

const regalia = {baseType: "Body Armours", item: "Vaal Regalia", rarity: "Rare" as const};
const goldRing = {baseType: "Rings", item: "Gold Ring", rarity: "Rare" as const};

const settings: ItemCraftingSettings = {
  ...itemCraftingDefault,
  itembase: regalia,
  selectedRareMods: {
    "Body Armours-int_armour-#% increased Energy Shield": {itembase: regalia, selected: true, values: {0: "80"}},
    "Rings-ring-+#% to Fire Resistance": {itembase: goldRing, selected: true, values: {}},
  },
  selectedMagicMods: [
    {basetype: "Body Armours", category: "int_armour", desc: "Healthy", affix: "PREFIX", regex: {name: "Healthy", desc: "+# to maximum Life"}},
  ],
};

describe("rebaseItemSettings", () => {
  const rebased = rebaseItemSettings(settings, englishBases, germanBases, englishRegex, germanRegex).settings;

  test("moves the selected base to the same item in the other language", () => {
    expect(rebased.itembase).toEqual({baseType: "Body Armours", item: "Vaal-Regalia", rarity: "Rare"});
  });

  test("moves rare mods of every base, not only the selected one", () => {
    expect(rebased.selectedRareMods).toEqual({
      "Body Armours-int_armour-#% erhöhter Energieschild": {
        itembase: {baseType: "Body Armours", item: "Vaal-Regalia", rarity: "Rare"}, selected: true, values: {0: "80"},
      },
      "Rings-ring-+#% zu Feuerwiderstand": {
        itembase: {baseType: "Rings", item: "Goldring", rarity: "Rare"}, selected: true, values: {},
      },
    });
  });

  test("moves magic mods to the affix at the same position", () => {
    expect(rebased.selectedMagicMods).toEqual([{
      basetype: "Body Armours", category: "int_armour", desc: "Gesunde", affix: "PREFIX",
      regex: {name: "Gesunde", desc: "+# zu maximalem Leben"},
    }]);
  });

  test("round-trips back to the original settings", () => {
    const back = rebaseItemSettings(rebased, germanBases, englishBases, germanRegex, englishRegex).settings;
    expect(back).toEqual(settings);
  });

  test("keeps the base and drops mods it cannot find", () => {
    const unknown = rebaseItemSettings({
      ...settings,
      itembase: {baseType: "Body Armours", item: "Unknown", rarity: "Rare"},
      selectedRareMods: {"Body Armours-int_armour-unknown": {itembase: regalia, selected: true, values: {}}},
      selectedMagicMods: [],
    }, englishBases, germanBases, englishRegex, germanRegex).settings;
    expect(unknown.itembase?.item).toBe("Unknown");
    expect(unknown.selectedRareMods).toEqual({});
  });
});

describe("hasItem", () => {
  test("finds an item in its own language only", () => {
    expect(hasItem(englishBases, regalia)).toBe(true);
    expect(hasItem(germanBases, regalia)).toBe(false);
    expect(hasItem(germanBases, undefined)).toBe(true);
  });
});
