import {normalizePriceRange} from "@shared/core/PriceRange";

export type PriceCurrency = "chaos" | "exalted" | "divine";

export function generatePriceRangeRegex(min: string, max: string, currency: PriceCurrency): string {
  const range = normalizePriceRange(min, max);
  if (!range) return "";
  const {min: lo, max: hi} = range;
  const broadRange = compactBroadPriceRange(lo, hi);
  if (broadRange) return `"${broadRange} ${currency}"`;
  const alternatives: string[] = [];

  for (let digits = 1; digits <= 3; digits += 1) {
    const floor = digits === 1 ? 0 : 10 ** (digits - 1);
    const ceiling = 10 ** digits - 1;
    const from = Math.max(lo, floor);
    const to = Math.min(hi, ceiling);
    if (from <= to) alternatives.push(...sameWidthRange(String(from), String(to)));
  }

  const number = alternatives.length === 1 ? alternatives[0] : `(${alternatives.join("|")})`;
  return `"${number} ${currency}"`;
}

function compactBroadPriceRange(lo: number, hi: number): string {
  if (lo === 0 && hi === 9) return "\\d";
  if (lo === 0 && hi === 99) return "[1-9]?\\d";
  if (lo === 1 && hi === 99) return "[1-9]\\d?";
  if (lo === 0 && hi === 999) return "(0|[1-9]\\d{0,2})";
  if (lo === 1 && hi === 999) return "[1-9]\\d{0,2}";
  return "";
}

function sameWidthRange(from: string, to: string): string[] {
  if (from === to) return [from];
  let common = 0;
  while (from[common] === to[common]) common += 1;
  const prefix = from.slice(0, common);
  const start = Number(from[common]);
  const end = Number(to[common]);
  const suffixLength = from.length - common - 1;
  const parts: string[] = [];

  const startSuffix = from.slice(common + 1);
  const partialStart = startSuffix.split("").some((digit) => digit !== "0");
  if (partialStart) {
    for (const suffix of sameWidthRange(startSuffix, "9".repeat(suffixLength))) {
      parts.push(`${prefix}${start}${suffix}`);
    }
  }

  const endSuffix = to.slice(common + 1);
  const partialEnd = endSuffix.split("").some((digit) => digit !== "9");
  const fullStart = start + (partialStart ? 1 : 0);
  const fullEnd = end - (partialEnd ? 1 : 0);
  if (fullStart <= fullEnd) {
    const digit = fullStart === fullEnd
      ? String(fullStart)
      : fullStart === 0 && fullEnd === 9 ? "\\d" : `[${fullStart}-${fullEnd}]`;
    parts.push(`${prefix}${digit}${"\\d".repeat(suffixLength)}`);
  }

  if (partialEnd) {
    for (const suffix of sameWidthRange("0".repeat(suffixLength), endSuffix)) {
      parts.push(`${prefix}${end}${suffix}`);
    }
  }
  return parts;
}
