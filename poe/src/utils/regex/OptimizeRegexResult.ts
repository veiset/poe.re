import type {RegexResult as Regex, Token} from "@poe/types/generated/mapmods";
import {distinct} from "../ListUtils";

export function idToRegex(id: number, regex: Regex<any>): string | undefined {
  return regex.tokens.find((token) => id === token.id)?.regex
}

export const optimizeRegexFromIds = (selectedIds: number[], regex: Regex<any>): string[] => {
  const regexTokenIds= regex.tokens.map((token) => token.id)
  const existingSelectedIds = selectedIds.filter((id) => regexTokenIds.includes(id));
  return optimizedRegexTokens(existingSelectedIds, regex);
}

function optimizedRegexTokens(selectedIds: number[], regex: Regex<any>): string[] {
  const numberOfIds = selectedIds.length;
  const optimizationTable = regex.optimizationTable
  const maxLength = optimizationSize(numberOfIds);
  const optimizationKeys = generateOptimizationKeys(selectedIds, maxLength);

  let optimizedRegex: string[] = []
  const unoptimizedIds = optimizationKeys.reduce((ids, key) => {
    const optimizationResult = optimizationTable[key];
    if (optimizationResult === undefined || !optimizationResult.ids.every(id => ids.includes(id))) {
      return ids;
    } else {
      optimizedRegex = optimizedRegex.concat(optimizationResult.regex)
      const idsToRemove = optimizationResult.ids;
      return ids.filter(id => !idsToRemove.some((toRemove) => toRemove === id));
    }
  }, selectedIds)

  const unoptimizedTokens = unoptimizedIds.map((tokenId) =>
    regex.tokens.find((token) => token.id === tokenId)
  ).filter((token) => token !== undefined) as Token<any>[];

  const result = optimizedRegex.concat(unoptimizedTokens.map((token) => token.regex));
  return distinct(result);
}

function optimizationSize(numberOfElements: number) {
  if (numberOfElements < 15) return 8;
  if (numberOfElements < 18) return 7;
  if (numberOfElements < 21) return 6;
  if (numberOfElements < 28) return 5;
  return 4;
}

function generateOptimizationKeys(arr: number[], maxLength: number): string[] {
  const result: string[] = [];
  const minLength = 2;

  function combine(start: number, combination: number[]) {
    if (combination.length >= minLength && combination.length <= maxLength) {
      result.push(combination.join(':'));
    }

    for (let i = start; i < arr.length; i++) {
      if (combination.length < maxLength) {
        combine(i + 1, [...combination, arr[i]]);
      }
    }
  }
  combine(0, []);
  return result.sort((a, b) => b.length - a.length);
}
