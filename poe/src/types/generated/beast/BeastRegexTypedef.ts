export interface BeastRegexEntry {
  beast: string;
  harvest: boolean;
  recipe: string;
  red: boolean;
  regex: string;
}

export type BeastRegex = Array<BeastRegexEntry>;
