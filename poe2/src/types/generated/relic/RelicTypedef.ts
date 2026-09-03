export interface RelicRegex {
  affix: string;
  name: string;
  ranges: Array<Array<number>>;
  regex: string;
  values: Array<number>;
}

export type Relic = Array<RelicRegex>;
