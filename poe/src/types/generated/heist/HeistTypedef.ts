export interface HeistOutput {
  heistContractTypes: Record<string, HeistContractType>;
  heistModifiers: Record<string, HeistMod>;
  heistTargetValues: Record<string, HeistTargetValue>;
}

export interface HeistContractType {
  matchSafe: string;
  name: string;
}

export interface HeistMod {
  matchSafe: string;
  value: string;
}

export interface HeistTargetValue {
  coinValue: number;
  matchSafe: string;
  name: string;
}

export type Heist = HeistOutput;
