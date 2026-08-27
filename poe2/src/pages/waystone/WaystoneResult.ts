import {Settings} from "../../settings";
import {generateNumberRegex} from "@shared/core/regex/GenerateNumberRegex";
import {selectedOptionRegex} from "../../utils/SelectedOptionRegex";
import {generateRarityRegex} from "../../utils/GenerateRarityRegex";
import {generatePriceRangeRegex} from "@poe/utils/regex/GeneratePriceRangeRegex";

export function generateWaystoneRegex(settings: Settings): string {
  const result = [
    generateRarityRegex(settings.waystone.rarity),
    generateTierRegex(settings.waystone.tier),
    generateReviveRegex(settings.waystone.revives),
    generateModifiers(settings.waystone.modifier),
    generateState(settings.waystone.state),
    ...generateQuantifiers(settings.waystone),
    settings.waystone.asyncPriceRange.enabled
      ? generatePriceRangeRegex(
        settings.waystone.asyncPriceRange.min,
        settings.waystone.asyncPriceRange.max,
        settings.waystone.asyncPriceRange.currency,
      )
      : null,
    settings.waystone.resultSettings.customText || null,
  ].filter((e) => e !== null);

  if (result.length === 0) return "";
  return result.join(" ").trim();
}


function generateTierRegex(settings: Settings["waystone"]["tier"]): string | null {
  if (settings.max === 0 && settings.min === 0) return null
  if (settings.max !== 0 && settings.min > settings.max) return null;
  if (settings.min < 1 || settings.max < 1) return null;
  if (settings.min <= 1 && settings.max === 16) return null;

  const max = settings.max === 0 ? 16 : settings.max;
  const min = settings.min;

  const numbersUnder10 = range(min, Math.min(10, max + 1));
  const numbersOver10 = range(Math.max(10, min), max + 1);

  const regexUnder10 = numbersUnder10.length <= 1 ? `${numbersUnder10.join("")}` :
    numbersUnder10.length > 2 ? `[${numbersUnder10[0]}-${numbersUnder10[numbersUnder10.length - 1]}]` : `[${numbersUnder10.join("")}]`;

  const regexOver10 = numbersOver10.length <= 1 ? `${numbersOver10.join("")}` : `1[${numbersOver10.map((e) => e.toString()[1]).join("")}]`;

  const under10 = regexUnder10 === "" ? "" : `r ${regexUnder10}\\)`
  const over10 = regexOver10 === "" ? "" : `${regexOver10}\\)`
  const result = [under10, over10].filter((e) => e !== "").join("|");
  return result === "" ? "" : `"er ${result}"`
}

function generateReviveRegex(settings: Settings["waystone"]["revives"]): string | null {
  if (settings.min > settings.max) return null;
  if (settings.min < 0 || settings.max < 0) return null;
  if (settings.min <= 0 && settings.max === 6) return null;

  const max = settings.max;
  const min = settings.min;

  const numbers = range(min, max + 1);

  const regex = numbers.length <= 1 ? `${numbers.join("")}` :
    numbers.length > 2 ? `[${numbers[0]}-${numbers[numbers.length - 1]}]` : `[${numbers.join("")}]`;

  return regex === "" ? "" : `"le: ${regex}"`;
}

function generateModifiers(settings: Settings["waystone"]["modifier"]): string | null {
  const wantedMods = settings.wantedMods
    .filter((e) => e.isSelected)
    .map((e) => selectedOptionRegex(e, settings.round10));

  const wantedModsWithType = settings.wantedModsSelectType === "any"
    ? `"${wantedMods.join("|")}"`
    : wantedMods.map((e) => `"${e}"`).join(" ");

  const unwantedMods = settings.unwantedMods
    .filter((e) => e.isSelected)
    .map((e) => selectedOptionRegex(e, settings.round10))
    .join("|")

  return [
    (wantedMods.length) > 0 ? wantedModsWithType : null,
    unwantedMods.length > 0 ? `"!${unwantedMods}"` : null,
  ].join(" ");
}

function generateState(settings: Settings["waystone"]["state"]): string | null {
  const delirious = settings.delirious ? "delir" : null;
  const corrupted =
    settings.corrupted && !settings.uncorrupted ? "corr"
      : !settings.corrupted && settings.uncorrupted ? "!corr"
      : null

  return [delirious, corrupted].filter(s => s !== null).join(" ")
}

function generateQuantifiers(waystone: Settings["waystone"]): string[] {
  const round10 = waystone.modifier.round10;

  return [
    addQuantifier(
      "m q.*",
      generateNumberRegex(waystone.itemQuantity, round10),
    ),
    addQuantifier(
      "m rar.*",
      generateNumberRegex(waystone.itemRarity, round10),
    ),
    addQuantifier(
      "p c.*",
      generateNumberRegex(waystone.waystoneDropChance, round10),
    ),
    addQuantifier(
      "r ef.*",
      generateNumberRegex(waystone.monsterEffectiveness, round10),
    ),
    addQuantifier(
      "r rar.*",
      generateNumberRegex(waystone.monsterRarity, round10),
    ),
    addQuantifier(
      "k s.*",
      generateNumberRegex(waystone.packSize, round10),
    ),
    addQuantifier(
      "c m.*",
      generateNumberRegex(waystone.magicMonsters, round10),
    ),
    addQuantifier(
      "e mo.*",
      generateNumberRegex(waystone.rareMonsters, round10),
    ),
  ];
}

function addQuantifier(prefix: string, string: string) {
  if (string === "") {
    return "";
  }
  return `"${prefix}${string}%"`;
}

function range(start: number, end: number): number[] {
  if (end - start <= 0) return [];
  return [...Array((end - start)).keys()].map(i => i + start);
}
