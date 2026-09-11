export interface BeastRegexEntry {
  beast: string;
  family: string;
  group: string;
  harvest: boolean;
  id: number;
  recipe: string;
  red: boolean;
  regex: string;
}

export type BeastRegex = Array<BeastRegexEntry>;
