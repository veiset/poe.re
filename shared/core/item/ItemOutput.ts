import {RareModSelection} from "@shared/core/item/RareItemSelect";
import {generateBoundedValueRegex} from "@shared/core/regex/GenerateNumberRegex";
import {countWords} from "@shared/core/utils";
import {SelectedMagicMod} from "@shared/core/item/MagicItemSelect";
import {Itembase} from "@shared/core/item/ItemBaseSelector";
import {wordRegex} from "@shared/core/regex/NumberOfWordsRegex";
import type {AffixStat, BaseType, ItemAffixRegex} from "@shared/generated/item";
import {ItemCraftingSettings} from "@shared/types/Settings.types";

type RareModSelectionEntry = {
  key: string;
  value: RareModSelection;
  regex: ItemAffixRegex
};


const openPrefix = (item: string) => `^${item}`;
const openSuffix = (item: string) => `${item}$`;

function boundedValueRegex(value: string, numberIndex: number, stats: AffixStat[]): string {
  const max = stats.find((stat) => stat.numberIndex === numberIndex)?.max
    ?? stats[numberIndex]?.max;
  return generateBoundedValueRegex(value, max?.toString() ?? "", false);
}

export function generateMagicItemRegex(
  settings: ItemCraftingSettings,
  basetypes: BaseType[],
) {
  const itembase = settings.itembase;
  if (!itembase) return "";

  const regex = generateRegexAffixes(settings, itembase);

  if (settings.matchSimilarBases) {
    return regex.replaceAll(itembase.item, itemGenericMatch(itembase, basetypes));
  }
  return regex;
}

function itemGenericMatch(itembase: Itembase, basetypes: BaseType[]) {
  const words = itembase.item.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  const firstWordsCount = words.length - 1;

  if (firstWordsCount > 0) {
    return `${wordRegex(firstWordsCount)}\\s${lastWord}`;
  }

  const similarItems = basetypes
    .find(b => b.base === itembase.baseType)?.item
    .filter(item => countWords(item) === 1) ?? [];
  return similarItems.length > 1 ? `(${similarItems.join("|")})` : itembase.item;
}

function generateRegexAffixes(
  settings: ItemCraftingSettings,
  itemBase: Itembase,
) {
  const selectedMods: SelectedMagicMod[] = settings.selectedMagicMods;
  const mods = selectedMods.filter((e) => e.basetype === itemBase.baseType);

  const affixDescription = (mod: SelectedMagicMod) => mod.regex.description ?? mod.regex.desc ?? mod.desc;
  const prefixes = mods.filter((e) => e.affix === "PREFIX").map(affixDescription);
  const suffixes = mods.filter((e) => e.affix === "SUFFIX").map(affixDescription);

  if (!settings.magicSettings.matchOpenAffix && !settings.magicSettings.onlyIfBothPrefixAndSuffix) {
    const prefixMatch = prefixes.length > 0 ? prefixes.map((e) => `^${e}`) : [];
    const suffixMatch = suffixes.length > 0 ? suffixes.map((e) => `${e}$`) : [];
    const s = prefixMatch.concat(suffixMatch).filter((e) => e !== null).join("|");
    return s ? `"${s}"` : "";
  } else if (!settings.magicSettings.matchOpenAffix && settings.magicSettings.onlyIfBothPrefixAndSuffix) {
    const prefixMatch = prefixes.length > 0 ? `(${prefixes.join("|")})` : "";
    const suffixMatch = suffixes.length > 0 ? `(${suffixes.join("|")})` : "";
    return `"${prefixMatch}\\s?${itemBase.item}\\s?${suffixMatch}"`;
  } else if (settings.magicSettings.matchOpenAffix && settings.magicSettings.onlyIfBothPrefixAndSuffix) {
    const prefixMatch = prefixes.length > 0 ? `(${prefixes.join("|")})` : "";
    const suffixMatch = suffixes.length > 0 ? `(${suffixes.join("|")})` : "";
    const item = itemBase.item;
    if (prefixMatch.length === 0 && suffixMatch.length === 0) return "";
    return `"^${prefixMatch}\\s${item}|${openPrefix(item)}" "${item}\\s${suffixMatch}|${openSuffix(item)}"`
  } else if (settings.magicSettings.matchOpenAffix && !settings.magicSettings.onlyIfBothPrefixAndSuffix) {
    const prefixMatch = prefixes.length > 0 ? prefixes.map((e) => `^${e}`) : [];
    const suffixMatch = suffixes.length > 0 ? suffixes.map((e) => `${e}$`) : [];
    const item = itemBase.item;
    const s = prefixMatch.concat(suffixMatch).concat([openPrefix(item), openSuffix(item)]).filter((e) => e !== null).join("|");
    return s ? `"${s}"` : "";
  }
  return "Error reading configuration";
}

export function generateRareItemRegex(
  affixMap: Record<string, ItemAffixRegex>,
  settings: ItemCraftingSettings,
): string {
  const itemBase = settings.itembase;
  const selectedMods = settings.selectedRareMods;

  if (!itemBase) return "";

  const mods: RareModSelectionEntry[] = Object.entries(selectedMods)
    .map(([key, value]) => ({key, value, regex: affixMap[key]}))
    .filter((entry): entry is RareModSelectionEntry => entry.regex !== undefined);

  const result = mods
    .filter((e) => e.value.selected)
    .filter((e) => e.key.startsWith(itemBase.baseType))
    .map((e) => {
      const rangeInRegex = e.regex.regexPosition.on[0];
      const hasRangeInsideRegex = rangeInRegex !== undefined
        && e.value.values[rangeInRegex] !== ""
        && e.value.values[rangeInRegex] !== undefined;
      const regex = hasRangeInsideRegex
        ? e.regex.regex
          .replace(
            "\\d+",
            boundedValueRegex(e.value.values[rangeInRegex], rangeInRegex, e.regex.stats) + "[^ ]+"
          )
        : e.regex.regex;
      const numbersBefore = e.regex.regexPosition.before
        .flatMap((numberIndex) => {
          const value = e.value.values[numberIndex];
          return value !== undefined && value !== ""
            ? [boundedValueRegex(value, numberIndex, e.regex.stats)]
            : [];
        })
        .join(".*");
      const numbersAfter = e.regex.regexPosition.after
        .flatMap((numberIndex) => {
          const value = e.value.values[numberIndex];
          return value !== undefined && value !== ""
            ? [boundedValueRegex(value, numberIndex, e.regex.stats)]
            : [];
        })
        .join(".*");

      const regexStr = [numbersBefore, regex, numbersAfter]
        .filter((e) => e !== undefined && e !== "")
        .join(".*");

      return {
        str: regexStr,
        affixtype: e.regex.affixType
      };
    });

  if (settings.rareSettings.matchPrefixAndSuffix) {
    const prefixes = result.filter(e => e.affixtype === "PREFIX").map(e => e.str).join("|");
    const suffixes = result.filter(e => e.affixtype === "SUFFIX").map(e => e.str).join("|");

    if (prefixes && suffixes) {
      return `"${prefixes}" "${suffixes}"`;
    }
    // Fallback to default behavior if one of the categories is empty
    return result.map((e) => `"${e.str}"`).join(" ");
  } else if (settings.rareSettings.matchAnyMod) {
    const regex = result.map(e => e.str).join("|");
    return regex.length > 0 ? `"${regex}"` : "";
  } else {
    return result.map((e) => `"${e.str}"`).join(" ");
  }
  // return result.join("|");
}
