import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import React, { useContext, useEffect, useState } from "react";
import "./Tattoo.css";
import Collapsable from "@poe/components/collapsable/Collapsable";
import { dateTextFromString } from "../expedition/ExpeditionUtils";
import {loadProfiles, loadSettings, saveSettings, valueFromKeyMap} from "@poe/utils/LocalStorage";
import { ProfileContext } from "@poe/components/profile/ProfileContext";
import { tattooRegex } from "@poe/generated/GeneratedTattoo";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import {economyUrl, fetchEconomyFile} from "@shared/economy";
import {usePoe1League} from "@shared/core/LeagueContext";
import PriceRangeSlider from "@shared/components/PriceRangeSlider/PriceRangeSlider";
import {economyPriceRange} from "@poe/utils/EconomyPriceRange";

interface PoeNinjaTattooLine {
    id: string
    primaryValue: number
}

interface PoeNinjaTattooItem {
    id: string
    name: string
}

export interface PoeNinjaTattooData {
    lines: PoeNinjaTattooLine[]
    items: PoeNinjaTattooItem[]
}

interface TattooPriceRegex {
    name: string
    chaosValue: number
    regex: string
    description: string
}

const sortByChaosValue = (e1: TattooPriceRegex, e2: TattooPriceRegex) => e2.chaosValue - e1.chaosValue;

const generateRegex = (
    prices: TattooPriceRegex[],
    minValue: number | undefined,
    maxValue: number | undefined,
): string => {
    const regex = prices
        .filter((e) => e.chaosValue > 0)
        .filter((e) => {
            if (minValue && e.chaosValue < minValue) return false;
            if (maxValue && e.chaosValue > maxValue) return false;
            return true;
        })
        // .slice(0, 50)
        .reduce((acc, e) => {
            const currentLength = acc.length;
            const newLength = currentLength + e.regex.length + (currentLength > 0 ? 1 : 0);
            if (newLength > 250) return acc;
            return currentLength > 0 ? `${acc}|${e.regex}` : e.regex;
        }, "");
    return `"${regex}"`;
}

const Tattoo = () => {
    const { globalProfile } = useContext(ProfileContext);
    const profile = loadSettings(globalProfile);
    const savedProfile = loadProfiles()[globalProfile];
    const hasSavedPriceRange = React.useRef(
        valueFromKeyMap(savedProfile, "tattoo.minValue") !== undefined ||
        valueFromKeyMap(savedProfile, "tattoo.maxValue") !== undefined
    );
    const {league} = usePoe1League();
    const [minChaosValue, setMinChaosValue] = useState<string>(profile.tattoo.minValue || "0");
    const [maxChaosValue, setMaxChaosValue] = useState<string>(profile.tattoo.maxValue || "999");

    const [tattooPrices, setTattooPrices] = useState<TattooPriceRegex[]>([]);
    const [lastUpdated, setLastUpdated] = useState("Outdated prices. Check back in a few mins...");
    const [result, setResult] = useState<string>("");
    const [priceRangeInitialized, setPriceRangeInitialized] = useState(hasSavedPriceRange.current);

    useEffect(() => {
        if (!league) return;
        fetch(economyUrl("generated.txt"))
            .then((r) => r.text())
            .then((date) => {
                setLastUpdated(dateTextFromString(date));
            });
        const data = fetchEconomyFile<PoeNinjaTattooData>("tattoo", league, "Tattoo");

        data.then((d) => {
            // Map items (name -> id)
            const nameToId = new Map(d.items.map((i) => [i.name, i.id]));
            // Map lines (id -> price)
            const idToPrice = new Map(d.lines.map((l) => [l.id, l.primaryValue]));

            // Map regexes to prices
            const pricedRegex: TattooPriceRegex[] = tattooRegex.map((t) => {
                const id = nameToId.get(t.tattoo);
                const price = id ? (idToPrice.get(id) ?? 0) : 0;
                return {
                    name: t.tattoo,
                    chaosValue: Math.ceil(price),
                    regex: t.regex,
                    description: t.description
                };
            });

            pricedRegex.sort(sortByChaosValue);
            setTattooPrices(pricedRegex);
        });
    }, [league]);

    useEffect(() => {
        if (priceRangeInitialized) return;
        const range = economyPriceRange(tattooPrices.map((tattoo) => tattoo.chaosValue));
        if (!range) return;
        setMinChaosValue(range.min);
        setMaxChaosValue(range.max);
        setPriceRangeInitialized(true);
    }, [tattooPrices, priceRangeInitialized]);

    useEffect(() => {
        if (priceRangeInitialized) {
            saveSettings({
                ...profile,
                tattoo: {
                    minValue: minChaosValue,
                    maxValue: maxChaosValue,
                }
            });
        }
        const minChaosN = minChaosValue ? minChaosValue as unknown as number : undefined;
        const maxChaosN = maxChaosValue ? maxChaosValue as unknown as number : undefined;
        setResult(generateRegex(tattooPrices, minChaosN, maxChaosN));
    }, [minChaosValue, maxChaosValue, tattooPrices, priceRangeInitialized]);

    return (
        <>
            <Header text={"Tattoo"}/>
            <RegexResultBox result={result} warning={""} reset={() => {
                const range = economyPriceRange(tattooPrices.map((tattoo) => tattoo.chaosValue));
                setPriceRangeInitialized(range !== undefined);
                setMinChaosValue(range?.min ?? "0");
                setMaxChaosValue(range?.max ?? "");
            }} />
            <p className="tattoo-price-info">Using price data from the {league} League. Last updated: {lastUpdated}</p>
            <div className="filter-card-grid">
                <FilterCard title="Settings">
                    <PriceRangeSlider id="tattoo-price" minValue={minChaosValue} maxValue={maxChaosValue}
                                      onMinChange={(value) => { setPriceRangeInitialized(true); setMinChaosValue(value); }}
                                      onMaxChange={(value) => { setPriceRangeInitialized(true); setMaxChaosValue(value); }}
                                      availablePrices={tattooPrices.map((tattoo) => tattoo.chaosValue)} allowZero/>
                </FilterCard>
            </div>
            <div className="row">
                <Collapsable header={"Price data"} isOpenByDefault={true}>
                    <div className="tattoo-row tattoo-header">
                        <div className="tattoo-name-cell">Tattoo name</div>
                        <div className="tattoo-regex-cell">Regex</div>
                        <div className="tattoo-value-cell">Chaos</div>
                        <div className="tattoo-description-cell">Effect</div>
                    </div>
                    {tattooPrices.map((e) => {
                        const highlighted = result.includes(e.regex);
                        const highlightedCss = highlighted ? "tattoo-highlighted" : "";
                        return (
                            <div className={`tattoo-row ${highlightedCss}`} key={e.name}>
                                <div className="tattoo-name-cell" key={e.name}>{e.name}</div>
                                <div className="tattoo-regex-cell">{e.regex}</div>
                                <div className="tattoo-value-cell">{e.chaosValue}</div>
                                <div className="tattoo-description-cell">{e.description}</div>
                            </div>
                        )
                    })}
                </Collapsable>
            </div>
        </>
    );
}

export default Tattoo;
