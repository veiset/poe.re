// typedefs for data.poe.re/generated/poe1/<patch>/gems/Generated.Gems.<LANGUAGE>.json
// typedefs for data.poe.re/generated/poe1/<patch>/mapmods/Generated.Map.<LANGUAGE>.json
// typedefs for data.poe.re/generated/poe1/<patch>/boatmods/Generated.BoatMods.ENGLISH.json
// typedefs for data.poe.re/generated/poe1/<patch>/divination-cards/Generated.DivinationCards.<LANGUAGE>.json
// typedefs for data.poe.re/generated/poe2/<patch>/tablet/Generated.Tablet.<LANGUAGE>.json
// typedefs for data.poe.re/generated/poe2/<patch>/waystone/Generated.Waystone.<LANGUAGE>.json

export interface Token<T = Record<string, never>> {
  id: number;
  regex: string;
  rawText: string;
  generalizedText: string;
  options: T;
}

export interface OptimizationEntry {
  ids: number[];
  regex: string;
  weight: number;
  count: number;
}

export interface RegexResult<T = Record<string, never>> {
  tokens: Token<T>[];
  optimizationTable: Record<string, OptimizationEntry>;
}
