import type {Item} from "@poe/types/generated/expedition";

export interface PoeNinjaItem {
  name: string
  baseType: string
  chaosValue: number
  icon: string
  links?: number
  detailsId?: string
}

export interface PoeNinjaData {
  lines: PoeNinjaItem[]
}

export interface PricedItemWithFallback {
  item: Item
  price: number | undefined
  fallbackPrice: number
  displayPrice: number
}

export interface PricedBaseType {
  baseType: string
  items: PricedItemWithFallback[]
  regex: string
  mostExpensiveItem: number
}

export interface PriceData {
  pricedBaseTypes: PricedBaseType[]
  usingOnlyFallback: boolean
}
