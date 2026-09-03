export interface ScarabRegex {
  description: string;
  flavourText: string;
  icon: string;
  name: string;
  regex: string;
}

export type Scarabs = Record<string, ScarabRegex>;
