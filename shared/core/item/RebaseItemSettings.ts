import type {BaseType, ItemRegex} from "@shared/generated/item";
import type {Itembase} from "@shared/core/item/ItemBaseSelector";
import type {ItemCraftingSettings} from "@shared/types/Settings.types";

// Every language lists the bases, items, categories and modifiers in the same
// order, so a selection moves to another language by its position in the data.

export const hasItem = (bases: BaseType[], itembase: Itembase | undefined): boolean =>
  !itembase || bases.some((base) => base.name === itembase.baseType && base.items.includes(itembase.item));

const rebaseItembase = (itembase: Itembase, sourceBases: BaseType[], targetBases: BaseType[]): Itembase | undefined => {
  const baseIndex = sourceBases.findIndex((base) => base.name === itembase.baseType);
  const itemIndex = sourceBases[baseIndex]?.items.indexOf(itembase.item) ?? -1;
  const targetBase = targetBases[baseIndex];
  const targetItem = targetBase?.items[itemIndex];
  return targetBase && itemIndex >= 0 && targetItem !== undefined
    ? {...itembase, baseType: targetBase.name, item: targetItem}
    : undefined;
};

export const rebaseItemSettings = (
  settings: ItemCraftingSettings,
  sourceBases: BaseType[],
  targetBases: BaseType[],
  sourceRegex: ItemRegex[],
  targetRegex: ItemRegex[],
): {settings: ItemCraftingSettings; basetypes: BaseType[]} => {
  const roots = (baseType: string | undefined) => {
    const index = sourceRegex.findIndex((entry) => entry.basetype === baseType);
    return {source: sourceRegex[index], target: targetRegex[index]};
  };

  const selectedRareMods: ItemCraftingSettings["selectedRareMods"] = {};
  for (const [key, selection] of Object.entries(settings.selectedRareMods)) {
    const {source, target} = roots(selection.itembase?.baseType ?? settings.itembase?.baseType);
    if (!source || !target) continue;
    const categoryIndex = source.categoryRegex.findIndex((category) =>
      category.modifiers.some((modifier) => `${source.basetype}-${category.category}-${modifier.desc}` === key));
    const sourceCategory = source.categoryRegex[categoryIndex];
    const targetCategory = target.categoryRegex[categoryIndex];
    const modifierIndex = sourceCategory?.modifiers.findIndex((modifier) =>
      `${source.basetype}-${sourceCategory.category}-${modifier.desc}` === key) ?? -1;
    const targetModifier = targetCategory?.modifiers[modifierIndex];
    if (targetCategory && targetModifier) {
      selectedRareMods[`${target.basetype}-${targetCategory.category}-${targetModifier.desc}`] = {
        ...selection,
        itembase: selection.itembase && (rebaseItembase(selection.itembase, sourceBases, targetBases) ?? selection.itembase),
      };
    }
  }

  const selectedMagicMods = settings.selectedMagicMods.flatMap((selection) => {
    const {source, target} = roots(selection.basetype);
    const categoryIndex = source?.categoryRegex.findIndex((category) => category.category === selection.category) ?? -1;
    const sourceCategory = source?.categoryRegex[categoryIndex];
    const targetCategory = target?.categoryRegex[categoryIndex];
    const modifierIndex = sourceCategory?.modifiers.findIndex((modifier) =>
      modifier.affixes.some((affix) => affix.name === selection.desc)) ?? -1;
    const sourceAffixes = sourceCategory?.modifiers[modifierIndex]?.affixes ?? [];
    const affixIndex = sourceAffixes.findIndex((affix) => affix.name === selection.desc);
    const targetAffix = targetCategory?.modifiers[modifierIndex]?.affixes[affixIndex];
    return target && targetCategory && targetAffix ? [{
      ...selection,
      basetype: target.basetype,
      category: targetCategory.category,
      desc: targetAffix.name,
      regex: targetAffix,
    }] : [];
  });

  const itembase = settings.itembase && (rebaseItembase(settings.itembase, sourceBases, targetBases) ?? settings.itembase);
  return {
    settings: {...settings, itembase, selectedRareMods, selectedMagicMods},
    basetypes: targetBases,
  };
};
