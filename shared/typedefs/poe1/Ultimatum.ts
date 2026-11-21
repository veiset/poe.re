// typedefs for data.poe.re/generated/poe1/<patch>/ultimatum/Generated.Ultimatum.<LANGUAGE>.json

export interface UltimatumRegex {
  modifiers: Array<UltimatumModifierRegex>;
  rewards: Array<UltimatumRewardRegex>;
  sacrifices: Array<UltimatumSacrificeRegex>;
}

export interface UltimatumModifierRegex {
  description: string;
  id: string;
  name: string;
  regex: string;
  tier: number;
}

export interface UltimatumRewardRegex {
  id: string;
  regex: string;
  reward: string;
}

export interface UltimatumSacrificeRegex {
  amounts: Array<number>;
  id: string;
  name: string;
  regex: string;
  reward: string;
}

export type Ultimatum = UltimatumRegex;
