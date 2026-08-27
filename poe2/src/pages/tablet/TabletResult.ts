import {Settings} from "../../settings";
import {selectedOptionRegex} from "../../utils/SelectedOptionRegex";
import {generateRarityRegex} from "../../utils/GenerateRarityRegex";
import {generatePriceRangeRegex} from "@poe/utils/regex/GeneratePriceRangeRegex";

/**
 * Generates tablet regex to be pasted in PoE2
 *
 * Generates regex for:
 *  rarity, league mechanic, uses remaining, selected affixes
 */
export function generateTabletRegex(settings: Settings): string {
  const result = [
    generateRarityRegex(settings.tablet.rarity),
    generateTypeRegex(settings.tablet.type),
    settings.tablet.modifier.usesRemaining
      ? generateUsesRemainingRegex(settings.tablet.modifier)
      : null,
    ...generateModifierRegex(settings.tablet.modifier),
    settings.tablet.asyncPriceRange.enabled
      ? generatePriceRangeRegex(
        settings.tablet.asyncPriceRange.min,
        settings.tablet.asyncPriceRange.max,
        settings.tablet.asyncPriceRange.currency,
      )
      : null,
    settings.tablet.resultSettings.customText || null,
  ].filter((e) => e !== null && e !== "");

  if (result.length === 0) return "";
  return result.join(" ").trim();
}

function generateModifierRegex(
  settings: Settings["tablet"]["modifier"],
): string[] {
  const affixes = settings.affixes
    .filter((e) => e.isSelected)
    .map((e) => selectedOptionRegex(e, settings.round10));

  if (affixes.length === 0) return [];

  if (settings.affixSelectType === "all") {
    return affixes.map((e) => `"${e}"`);
  }
  return [`"${affixes.join("|")}"`];
}

function generateTypeRegex(
  settings: Settings["tablet"]["type"],
): string | null {
  if (
    (settings.irradiated &&
      settings.ritual &&
      settings.delirium &&
      settings.breach &&
      settings.abyss &&
      settings.temple &&
      settings.overseer) ||
    (!settings.irradiated &&
      !settings.ritual &&
      !settings.delirium &&
      !settings.breach &&
      !settings.abyss &&
      !settings.temple &&
      !settings.overseer)
  ) {
    return null;
  }

  const irradiatedRegex = settings.irradiated ? "rra" : "";
  const ritualRegex = settings.ritual ? "tual" : "";
  const deliriumRegex = settings.delirium ? "liri" : "";
  const breachRegex = settings.breach ? "eac" : "";
  const abyssRegex = settings.abyss ? "byss" : "";
  const templeRegex = settings.temple ? "empl" : "";
  const overseerRegex = settings.overseer ? "eer" : "";

  const result = [
    irradiatedRegex,
    ritualRegex,
    deliriumRegex,
    breachRegex,
    abyssRegex,
    templeRegex,
    overseerRegex,
  ]
    .filter((e) => e.length > 0)
    .join("|");

  if (result.length === 0) return null;
  if (result.length === 1) return `"${result}"`;
  if (result.length > 1) return `"(${result})"`;
  return null;
}

function generateUsesRemainingRegex(
  settings: Settings["tablet"]["modifier"],
): string | null {
  const n = settings.numUsesRemaining;
  if (n < 1 || n > 18) {
    return null;
  }

  let numberRegex: string;
  if (n < 10) {
    /* single digit n..9, or 10-18 */
    numberRegex = `(${n === 9 ? "9" : `[${n}-9]`}|1[0-8])`;
  } else {
    /* 10-18 */
    numberRegex = `(1[${n % 10}-8])`;
  }

  return `"${numberRegex} us"`;
}
