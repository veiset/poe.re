export interface BeastRegexEntry {
  id: number;
  beast: string;
  harvest: boolean;
  recipe: string;
  red: boolean;
  regex: string;
  family: string;
  group: string;
}

export type BeastRegex = Array<BeastRegexEntry>;
