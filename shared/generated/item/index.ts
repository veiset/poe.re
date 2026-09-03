export interface BaseType {
  base: string
  item: string[]
}

export interface Affix {
  name: string
  description: string
  /** Retained for item selections saved before the JSON migration. */
  desc?: string
}

export interface AffixStat {
  id: string,
  min: number,
  max: number,
  numberIndex?: number | null
  hasRange: boolean
}

export interface ItemAffixRegex {
  description: string,
  regex: string,
  regexPosition: RegexPosition
  affixType: "PREFIX" | "SUFFIX"
  stats: AffixStat[]
  affixes: Affix[]
}

export interface RegexPosition {
  start: number
  end: number
  disabled: number[]
  before: number[]
  on: number[]
  after: number[]
}

export interface CategoryRegex {
  modCategory: string,
  warnings: string[],
  modifiers: ItemAffixRegex[]
}

export interface ItemRegex {
  basetype: string,
  itemRegexForCategory: CategoryRegex[]
}
