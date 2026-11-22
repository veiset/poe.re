import {generateNumberRegex} from "./GenerateNumberRegex";
import type {PriceCurrency} from "@poe/utils/regex/GeneratePriceRangeRegex";
import type {ProfileMetadata} from "@shared/components/profile/ProfileImportBox";

export interface RegexToken {
  raw: string;
  value: string;
  negated: boolean;
  quoted: boolean;
}

export interface RegexImportCandidate<TSettings> {
  pageKey: string;
  pageLabel: string;
  route: string;
  score: number;
  metadata: ProfileMetadata[];
  settings: TSettings;
}

export function tokenizeRegex(input: string): RegexToken[] {
  const tokens: RegexToken[] = [];
  const s = input.trim();
  let i = 0;

  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;

    const start = i;
    let negatedOutside = false;
    if (s[i] === "!" && s[i + 1] === '"') {
      negatedOutside = true;
      i++;
    }

    if (s[i] === '"') {
      i++;
      const bodyStart = i;
      while (i < s.length) {
        if (s[i] === "\\" && s[i + 1] === '"' && s.indexOf('"', i + 2) !== -1) {
          i += 2;
          continue;
        }
        if (s[i] === '"') break;
        i++;
      }
      const rawBody = s.slice(bodyStart, i);
      if (i < s.length && s[i] === '"') i++;
      const raw = s.slice(start, i);
      const negatedInside = rawBody.startsWith("!");
      const value = negatedInside ? rawBody.slice(1) : rawBody;
      if (value.length > 0) {
        tokens.push({
          raw,
          value,
          negated: negatedOutside || negatedInside,
          quoted: true,
        });
      }
    } else {
      while (i < s.length && !/\s/.test(s[i])) {
        if (s[i] === '"') {
          i++;
          while (i < s.length && s[i] !== '"') i++;
          if (i < s.length) i++;
        } else {
          i++;
        }
      }
      const raw = s.slice(start, i);
      const negated = raw.startsWith("!");
      let value = negated ? raw.slice(1) : raw;
      const quoted = value.startsWith('"') && value.endsWith('"') && value.length >= 2;
      if (quoted) value = value.slice(1, -1);
      if (value.startsWith("!")) {
        value = value.slice(1);
      }
      if (value.length > 0) {
        tokens.push({
          raw,
          value,
          negated: negated || raw.startsWith('"!'),
          quoted,
        });
      }
    }
  }

  return tokens;
}

export function splitTopLevelPipes(pattern: string): string[] {
  const parts: string[] = [];
  let parenDepth = 0;
  let bracketDepth = 0;
  let lastStart = 0;

  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (bracketDepth > 0) {
      if (ch === "]") bracketDepth--;
      continue;
    }
    if (ch === "[") {
      bracketDepth++;
    } else if (ch === "(") {
      parenDepth++;
    } else if (ch === ")") {
      if (parenDepth > 0) parenDepth--;
    } else if (ch === "|" && parenDepth === 0 && bracketDepth === 0) {
      parts.push(pattern.slice(lastStart, i));
      lastStart = i + 1;
    }
  }

  parts.push(pattern.slice(lastStart));
  return parts.filter((part) => part.length > 0);
}

export function unwrapOuterParens(pattern: string): string {
  if (!pattern.startsWith("(") || !pattern.endsWith(")")) return pattern;
  let parenDepth = 0;
  let bracketDepth = 0;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (bracketDepth > 0) {
      if (ch === "]") bracketDepth--;
      continue;
    }
    if (ch === "[") {
      bracketDepth++;
    } else if (ch === "(") {
      parenDepth++;
    } else if (ch === ")") {
      parenDepth--;
      if (parenDepth === 0 && i < pattern.length - 1) {
        return pattern;
      }
    }
  }
  return parenDepth === 0 ? pattern.slice(1, -1) : pattern;
}

const mapOptimizeNumberPattern = (s: string) =>
  s.replaceAll("[8-9]", "[89]").replaceAll("[9-9]", "9");

let exactNumberLookup: Map<string, { value: string; optimized: boolean }> | null = null;

function getExactNumberLookup(): Map<string, { value: string; optimized: boolean }> {
  if (exactNumberLookup) return exactNumberLookup;
  const map = new Map<string, { value: string; optimized: boolean }>();
  map.set(".", {value: "1", optimized: true});
  for (let n = 1; n <= 999; n++) {
    const str = String(n);
    const exact = generateNumberRegex(str, false);
    const opt = mapOptimizeNumberPattern(exact);
    if (!map.has(exact)) map.set(exact, {value: str, optimized: false});
    if (!map.has(opt)) map.set(opt, {value: str, optimized: false});
    const dotAsDigit = exact.replace(/\./g, "\\d");
    const optDotAsDigit = opt.replace(/\./g, "\\d");
    if (!map.has(dotAsDigit)) map.set(dotAsDigit, {value: str, optimized: false});
    if (!map.has(optDotAsDigit)) map.set(optDotAsDigit, {value: str, optimized: false});
  }
  exactNumberLookup = map;
  return map;
}

export function parseMinNumberFromRegex(pattern: string): { value: string; optimized: boolean } | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n >= 1 && n <= 999 ? {value: String(n), optimized: false} : null;
  }

  const lookup = getExactNumberLookup();
  const found = lookup.get(trimmed);
  if (found) return found;

  try {
    const re = new RegExp(`^(?:${trimmed})$`);
    for (let n = 1; n <= 999; n++) {
      if (re.test(String(n))) {
        return {value: String(n), optimized: false};
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function parseNumberRangeFromRegex(
  pattern: string,
  minDomain: number,
  maxDomain: number,
  formatCandidate: (n: number) => string = String,
): { min: number; max: number } | null {
  try {
    const re = new RegExp(`^(?:${pattern})$`, "i");
    let min: number | undefined;
    let max: number | undefined;
    for (let n = minDomain; n <= maxDomain; n++) {
      if (re.test(formatCandidate(n))) {
        if (min === undefined) min = n;
        max = n;
      }
    }
    if (min !== undefined && max !== undefined) {
      return {min, max};
    }
  } catch {
    return null;
  }
  return null;
}

export function parsePriceRangeToken<TCurrency extends PriceCurrency>(
  token: RegexToken,
  allowedCurrencies: readonly TCurrency[],
): { min: string; max: string; currency: TCurrency } | null {
  if (token.negated) return null;
  const match = /^\\s(.+)\s+(chaos|divine|exalted)$/i.exec(token.value);
  if (!match) return null;
  const [, numPattern, rawCurrency] = match;
  const currency = rawCurrency.toLowerCase() as TCurrency;
  if (!allowedCurrencies.includes(currency)) return null;
  const range = parseNumberRangeFromRegex(numPattern, 0, 999);
  if (!range) return null;
  return {
    min: String(range.min),
    max: String(range.max),
    currency,
  };
}
