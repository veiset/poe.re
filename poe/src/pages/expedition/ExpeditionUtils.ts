import {distinct, groupBy} from "@poe/utils/ListUtils";
import type {BaseTypeRegex, Item} from "@poe/types/generated/expedition";
import dayjs from "dayjs";
import {PoeNinjaItem, PriceData, PricedBaseType, PricedItemWithFallback} from "./ExpeditionTypes";

const sortByValue = (a: PricedItemWithFallback, b: PricedItemWithFallback): number => b.displayPrice - a.displayPrice

export const generateRegex = (selectedBases: string[], fillerBases: string[], baseTypeRegex: Record<string, BaseTypeRegex>): string => {
    const allBases = distinct(selectedBases.concat(fillerBases));
    if (allBases.length === 0) {
        return "";
    }

    const regex = allBases
        .map((e) => baseTypeRegex[e].regex)
        .join("|")
        .replaceAll("\"", "");
    return `"${regex}"`;
}

export const generateFillerBases = (selectedBases: string[], priceData: PriceData, minValue: number, baseTypeRegex: Record<string, BaseTypeRegex>): PricedBaseType[] => {
    const currentRegexLength = generateRegex(selectedBases, [], baseTypeRegex).length;
    let count = Math.max(currentRegexLength, 2);

    return priceData.pricedBaseTypes.reduce((acc: PricedBaseType[], el: PricedBaseType) => {
        if (el.mostExpensiveItem < minValue) return acc;
        let currentBases = selectedBases.concat(acc.map((e) => e.baseType));
        if (currentBases.includes(el.baseType)) {
            return acc;
        }
        const regexAddition = "|" + baseTypeRegex[el.baseType].regex.replaceAll("\"", "");
        const newRegexSize = count + regexAddition.length;
        if (newRegexSize > 250) {
            count = 250;
            return acc;
        } else {
            count += regexAddition.length;
            return acc.concat(el);
        }
    }, []);
}
export const generateSortedPriceData = (allItems: Item[], fallbackPrices: PoeNinjaItem[], leaguePrices: PoeNinjaItem[], baseTypeRegex: Record<string, BaseTypeRegex>): PriceData => {
    const fallbackMap = new Map(fallbackPrices.map(i => [i.name, i.chaosValue]));
    const leagueMap = new Map(leaguePrices?.map(i => [i.name, i.chaosValue]));

    const pricedItemsWithFallback: PricedItemWithFallback[] = allItems.map((item) => {
        const price = leagueMap.get(item.name);
        const fallbackPrice = fallbackMap.get(item.name) ?? -1;
        return {
            item: item,
            price: price,
            fallbackPrice: fallbackPrice,
            displayPrice: price ?? fallbackPrice,
        }
    });

    // Generate priced base types
    const groupedItems: { [key: string]: PricedItemWithFallback[] } = groupBy(pricedItemsWithFallback, (e) => e.item.baseType);
    const baseTypes: string[] = Array.from(Object.keys(groupedItems));
    const pricedBaseTypes = baseTypes.map((baseType) => {
        const items = groupedItems[baseType].sort(sortByValue);
        return {
            baseType: baseType,
            items: items,
            mostExpensiveItem: items[0].displayPrice,
            regex: baseTypeRegex[baseType].regex,
        }
    });

    return {
        pricedBaseTypes: pricedBaseTypes.sort((e1, e2) => e2.mostExpensiveItem - e1.mostExpensiveItem),
        usingOnlyFallback: leaguePrices.length === 0,
    }
}

export const dateTextFromString = (date: string): string => {
    const d2 = dayjs(date);
    if (d2.isValid()) {
        const nextUpdate = d2.add(1, "hour");
        if (dayjs(new Date()).diff(d2, "day") > 1) {
            return `Old economy. Using data from ${d2.fromNow()}. Prices will soon be updated.`;
        } else {
            return `Economy last updated ${d2.fromNow()}, next update at ~${nextUpdate.format("HH:mm:00 (Z)")}`;
        }
    }
    return "Economy real time is being updated. Will be ready in 5 mins or less.";
}

export const toggleSelectBaseType = (
    selectedBaseTypes: string[],
    setSelectedBaseType: (v: string[]) => void,
    baseType: string
) => {
    const baseTypeIsSelected = selectedBaseTypes.some((e) => e === baseType);
    if (baseTypeIsSelected) {
        setSelectedBaseType(selectedBaseTypes.filter((e) => e !== baseType));
    } else {
        setSelectedBaseType(selectedBaseTypes.concat(baseType));
    }
}
