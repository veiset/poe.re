export interface BaseType {
  name: string
  items: string[]
}

export interface Affix {
  name: string
  desc: string
}

export interface AffixStat {
  id: string,
  min: number,
  max: number,
  numberIndex?: number | null
  hasRange: boolean
}

export interface ItemAffixRegex {
  desc: string,
  regex: string,
  start: number
  end: number
  disabled: number[]
  before: number[]
  on: number[]
  after: number[]
  affixtype: "PREFIX" | "SUFFIX"
  stats: AffixStat[]
  affixes: Affix[]
}

export interface CategoryRegex {
  category: string,
  warnings: string[],
  modifiers: ItemAffixRegex[]
}

export interface ItemRegex {
  basetype: string,
  categoryRegex: CategoryRegex[]
}
