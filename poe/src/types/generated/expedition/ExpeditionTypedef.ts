export interface ExpeditionOutput {
  baseTypeRegex: Record<string, BaseTypeRegex>;
  numberOfUniques: number;
  obtainableItems: number;
  uniquesSeen: Array<string>;
}

export interface BaseTypeRegex {
  baseType: string;
  items: Array<Item>;
  regex: string;
}

export interface Item {
  baseType: string;
  detailsId?: string | null;
  icon: string;
  id: string;
  links?: number | null;
  name: string;
}

export type Expedition = ExpeditionOutput;
