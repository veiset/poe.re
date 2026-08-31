import {BaseType, CategoryRegex, ItemAffixRegex, ItemRegex} from "@shared/types/GeneratedItemMod.Types";
import {countWords} from "@shared/core/utils";
import {haveSameLastWord} from "@shared/core/regex/NumberOfWordsRegex";

export const cleanCategoryName = (category: string): string => category
  .replace(RegExp("suffix_?"), "Suffix")
  .replace(RegExp("prefix_?"), "Prefix")
  .replace("adjudicator", " Warlord")
  .replace("basilisk", " Hunter")
  .replace("crusader", " Crusader")
  .replace("eyrie", " Redeemer")
  .replace("elder", " Elder")
  .replace("shaper", " Shaper")

export const categoryOrder = (a: CategoryRegex, b: CategoryRegex) => {
  const priorityMap: Record<string, number> = {
    '': -1,
    'shaper': 0,
    'elder': 1,
    'basilisk': 2,
    'crusader': 3,
    'eyrie': 4,
    'adjudicator': 5,
  };
  const getPriority = (group: string) => {
    const name = group.replace(RegExp("(prefix|suffix)_?"), "");
    return priorityMap[name] ?? Infinity;
  };
  return getPriority(a.category) - getPriority(b.category);
};

export function groupedCategory(categories: CategoryRegex[]): Record<string, CategoryRegex[]> {
  return categories.reduce<Record<string, CategoryRegex[]>>((acc, category) => {
    const key = category.category.replace(RegExp("(suffix|prefix)_?"), "");
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(category);
    return acc;
  }, {});
}

export function groupAffixes(itemRegex: Record<string, ItemRegex>): Record<string, ItemAffixRegex> {
  return Object.entries(itemRegex)
    .flatMap(([basetype, item]) =>
      item.categoryRegex.flatMap(cat =>
        cat.modifiers.map(mod => ({
          key: `${basetype}-${cat.category}-${mod.desc}`,
          value: mod
        }))
      )
    )
    .reduce<Record<string, ItemAffixRegex>>((acc, {key, value}) => {
      acc[key] = value;
      return acc;
    }, {});
}

export function findSimilarBases(baseType: string, item: string, basetypes: BaseType[]): string[] {
  return basetypes.find(b => b.name === baseType)?.items
    .filter(bitem => countWords(bitem) === countWords(item))
    .filter(bitem => countWords(bitem) === 1 || haveSameLastWord(bitem, item))
    .filter(bitem => bitem !== item) ?? [];
}
