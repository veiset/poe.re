export interface ItemRegexForBasetype {
  basetype: string;
  itemRegexForCategory: Array<ItemRegexForCategory>;
}

export interface ItemRegexForCategory {
  baseitems: Array<string>;
  modCategory: string;
  modifiers: Array<ItemAffixRegex>;
  warnings: Array<string>;
}

export interface ItemAffixRegex {
  affixType: AffixType;
  affixes: Array<Affix>;
  description: string;
  regex: string;
  regexPosition: RegexPosition;
  stats: Array<Stat>;
}

export type AffixType = "PREFIX" | "SUFFIX";

export interface Affix {
  description: string;
  name: string;
}

export interface RegexPosition {
  after: Array<number>;
  before: Array<number>;
  disabled: Array<number>;
  end: number;
  on: Array<number>;
  start: number;
}

export interface Stat {
  hasRange: boolean;
  id: string;
  max: number;
  min: number;
  numberIndex?: number | null;
}

export type ItemGenerated = Array<ItemRegexForBasetype>;
