import {PoeNinjaItem, PricedBaseType, PricedItemWithFallback} from "./ExpeditionTypes";
import type {BaseTypeRegex} from "@poe/types/generated/expedition";

export const cleanUpPoeNinjaItems = (data: PoeNinjaItem[], baseTypeRegex: Record<string, BaseTypeRegex>): PoeNinjaItem[] => {
    return data
        .filter((e) => e.links === undefined)
        .filter((e) => !e.detailsId?.endsWith("relic"))
        .filter((e) => {
            const baseType: BaseTypeRegex | undefined = e.baseType in baseTypeRegex ? baseTypeRegex[e.baseType] : undefined;
            return baseType?.items.map((item) => item.name).includes(e.name);
        })
}

export const filterPricedItems = (
    pricedBaseTypes: PricedBaseType[],
    predicate: (pricedBaseType: PricedBaseType, item: PricedItemWithFallback) => boolean
): PricedItemWithFallback[] => {
    return pricedBaseTypes
        .flatMap((pricedBaseType: PricedBaseType) => {
            return pricedBaseType.items.filter((item) => predicate(pricedBaseType, item))
        })
}

export const showMostExpensiveAndValuedItems = (minValueToDisplay: number) => (pricedBaseType: PricedBaseType, item: PricedItemWithFallback) => {
    return item.displayPrice >= minValueToDisplay || item.displayPrice === pricedBaseType.mostExpensiveItem
}

export const showLowValueItems = (minValueToDisplay: number) => (pricedBaseType: PricedBaseType, item: PricedItemWithFallback) => {
    return item.displayPrice < minValueToDisplay && item.displayPrice !== pricedBaseType.mostExpensiveItem
}
