import type {RegexResult} from "@poe/types/generated/boatmods";
import {idToRegex} from "@poe/utils/regex/OptimizeRegexResult";

export function generateBoatModRegex(
  selectedIds: number[],
  allSelectedMods: boolean,
  regex: RegexResult<any>,
  matchChartsWithAdjacentModifier: boolean,
  matchChartsWithoutAdjacentModifier: boolean,
  selectedAreaRegexes: string[],
): string {
  const result: string[] = [];
  const adjacentModifierRegex = "adjacent";
  const selectedTokens = selectedIds
    .map((id) => idToRegex(id, regex))
    .filter((e) => e !== undefined) as string[];

  if (!allSelectedMods) {
    const combinedExpressions = [...selectedTokens, ...selectedAreaRegexes];
    if (combinedExpressions.length > 0) {
      result.push(`"${combinedExpressions.join("|")}"`);
    }
  } else {
    result.push(...selectedTokens.map((token) => token.includes(" ") ? `"${token}"` : token));
    if (selectedAreaRegexes.length > 0) {
      result.push(`"${selectedAreaRegexes.join("|")}"`);
    }
  }

  if (matchChartsWithAdjacentModifier) {
    result.push(`"${adjacentModifierRegex}"`);
  }

  if (matchChartsWithoutAdjacentModifier) {
    result.push(`"!${adjacentModifierRegex}"`);
  }

  return result.join(" ");
}
