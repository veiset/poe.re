import {JewelSettings} from "@poe/utils/SavedSettings";
import type {Jewel, JewelRegex} from "@poe/types/generated/jewel";

export function generateJewelRegex(settings: JewelSettings, jewel?: Jewel): string {
  if (!jewel) return "";
  const modLookupAbyss = new Map(jewel.abyss.map(i => [i.mod, i]));
  const modLookupRegular = new Map(jewel.regular.map(i => [i.mod, i]));
  const selectedMods = settings.abyssJewel ? settings.selectedAbyss : settings.selectedRegular;
  const modLookup = settings.abyssJewel ? modLookupAbyss : modLookupRegular;

  if (settings.magicOnly) {
    return generateMagicJewel(settings, selectedMods, modLookup);
  } else {
    return generateJewel(settings, selectedMods, modLookup);
  }

}

function generateMagicJewel(
  settings: JewelSettings,
  selectedMods: string[],
  lookup: Map<string, JewelRegex>
): string {
  const openPrefix = settings.abyssJewel ? "^([a-z]+ ){2}J" : "^[a-z]+ J";
  const openSuffix = "wel$";

  const mods = selectedMods.map((e) => lookup.get(e)!!);
  const prefixes = mods
    .filter((e) => e.isPrefix)
    .map((e) => e.regexAffix)
    .join("|");
  const suffixes = mods
    .filter((e) => !e.isPrefix)
    .map((e) => e.regexAffix)
    .join("|");

  if (prefixes.length > 0 && suffixes.length > 0) {
    if (settings.matchBothPrefixAndSuffix) {
      if (settings.matchOpenPrefixSuffix) {
        return `"${openPrefix}|${prefixes}" "${openSuffix}|${suffixes}"`;
      } else {
        return `"${prefixes}" "${suffixes}"`;
      }
    } else {
      return `"${prefixes}|${suffixes}"`;
    }
  } else if (prefixes.length > 0) {
    return `"${prefixes}"`;
  } else if (suffixes.length > 0) {
    return `"${suffixes}"`;
  } else {
    return "";
  }
}

function generateJewel(
  settings: JewelSettings,
  selectedMods: string[],
  lookup: Map<string, JewelRegex>
): string {
  const regex = selectedMods.map((mod) => {
    return lookup.get(mod)!!.regex;
  });
  if (regex.length === 0) return "";
  return settings.allMatch
    ? regex.map((e) => `"${e}"`).join(" ")
    : `"${regex.join("|")}"`;

}
