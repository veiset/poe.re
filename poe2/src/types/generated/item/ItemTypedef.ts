export interface LegacyItemRegex {
  basetype: string;
  categoryRegex: Array<LegacyCategoryRegex>;
}

export interface LegacyCategoryRegex {
  category: string;
  modifiers: Array<LegacyItemAffixRegex>;
  warnings: Array<string>;
}

export interface LegacyItemAffixRegex {
  affixes: Array<LegacyAffix>;
  affixtype: string;
  after: Array<number>;
  before: Array<number>;
  desc: string;
  disabled: Array<number>;
  end: number;
  on: Array<number>;
  regex: string;
  start: number;
  stats: Array<LegacyStat>;
}

export interface LegacyAffix {
  desc: string;
  name: string;
}

export interface LegacyStat {
  hasRange: boolean;
  id: string;
  max: number;
  min: number;
  numberIndex?: number | null;
}

export type ItemGenerated = Array<LegacyItemRegex>;
