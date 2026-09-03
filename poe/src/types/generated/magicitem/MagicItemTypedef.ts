export interface MagicItemOutput {
  itemTypes: Array<string>;
  magicItemGroups: Record<string, Array<MagicAffixOutput>>;
  problemBases: Record<string, Array<string>>;
}

export interface MagicAffixOutput {
  description: string;
  family: string;
  ilevel: number;
  isPrefix: boolean;
  name: string;
  regex: string;
}

export type MagicItem = MagicItemOutput;
