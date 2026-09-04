import type {Token} from "@poe2/types/generated/tablet";

export interface ParsedAffix {
  id: number,
  name: string,
  regex: string,
  values: number[],
  ranges: number[][],
}

export function parseAffixToken<T>(token: Token<T>): ParsedAffix {
  const ranges: number[][] = [];
  const values: number[] = [];

  const lines = token.rawText.split("\n");
  const processed = lines.map((line) => {
    let out = line;
    out = out.replace(/\(([+-]?\d+)-([+-]?\d+)\)/g, (_match, a, b) => {
      ranges.push([Number(a), Number(b)]);
      return "##";
    });
    out = out.replace(/(?<![A-Za-z0-9])\+?(\d+)(?![A-Za-z0-9])/g, (_match, n) => {
      values.push(Number(n));
      return "#";
    });
    out = out.replace(/\[([^\]]+)\]/g, "$1");
    return out;
  });

  return {
    id: token.id,
    name: processed.join("|"),
    regex: token.regex,
    values,
    ranges,
  };
}
