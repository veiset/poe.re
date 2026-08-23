import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import React, { useContext, useEffect, useState } from "react";
import "./Runegraft.css";
import Collapsable from "@poe/components/collapsable/Collapsable";
import { dateTextFromString } from "../expedition/ExpeditionUtils";
import {loadProfiles, loadSettings, saveSettings, valueFromKeyMap} from "@poe/utils/LocalStorage";
import { ProfileContext } from "@poe/components/profile/ProfileContext";
import { runegraftRegex } from "@poe/generated/GeneratedRunegraft";
import { tattooRegex } from "@poe/generated/GeneratedTattoo";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {economyUrl, fetchEconomyFile} from "@shared/economy";
import {usePoe1League} from "@shared/core/LeagueContext";
import PriceRangeSlider from "@poe/components/PriceRangeSlider/PriceRangeSlider";
import {economyPriceRange} from "@poe/utils/EconomyPriceRange";

interface PoeNinjaRunegraftLine {
    id: string
    primaryValue: number
    explicitModifiers: { text: string, optional: boolean }[]
}

interface PoeNinjaRunegraftItem {
    id: string
    name: string
}


export interface PoeNinjaRunegraftData {
    lines: PoeNinjaRunegraftLine[]
    items: PoeNinjaRunegraftItem[]
}

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

interface RunegraftPriceRegex {
    name: string
    chaosValue: number
    regex: string
    description: string
}

const sortByChaosValue = (e1: RunegraftPriceRegex, e2: RunegraftPriceRegex) => e2.chaosValue - e1.chaosValue;

const generateRegex = (
    prices: RunegraftPriceRegex[],
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
        .reduce((acc, e) => {
            const currentLength = acc.length;
            const newLength = currentLength + e.regex.length + (currentLength > 0 ? 1 : 0);
            if (newLength > 100) return acc;
            return currentLength > 0 ? `${acc}|${e.regex}` : e.regex;
        }, "");
    return `"${regex}"`;
}

const Runegraft = () => {
    const { globalProfile } = useContext(ProfileContext);
    const profile = loadSettings(globalProfile);
    const savedProfile = loadProfiles()[globalProfile];
    const hasSavedPriceRange = React.useRef(
        valueFromKeyMap(savedProfile, "runegraft.minValue") !== undefined ||
        valueFromKeyMap(savedProfile, "runegraft.maxValue") !== undefined
    );
    const {league} = usePoe1League();
    const [minChaosValue, setMinChaosValue] = useState<string>(profile.runegraft.minValue);
    const [maxChaosValue, setMaxChaosValue] = useState<string>(profile.runegraft.maxValue);
    const [includeTattoos, setIncludeTattoos] = useState<boolean>(profile.runegraft.includeTattoos ?? false);

    const [runegraftPrices, setRunegraftPrices] = useState<RunegraftPriceRegex[]>([]);
    const [tattooPrices, setTattooPrices] = useState<RunegraftPriceRegex[]>([]);
    const [displayedPrices, setDisplayedPrices] = useState<RunegraftPriceRegex[]>([]);
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
        const data = fetchEconomyFile<PoeNinjaRunegraftData>("runegraft", league, "Runegraft");

        data.then((d) => {
            // Create a map from name to price since the logic relies on regex matching names
            // The JSON has flat lines with name and chaosValue
            const nameToId = new Map(d.items.map((i) => [i.name, i.id]));
            const idToPrice = new Map(d.lines.map((l) => [l.id, l.primaryValue]));
            // Map regexes to prices
            const pricedRegex: RunegraftPriceRegex[] = runegraftRegex.map((t) => {
                const id= nameToId.get(t.runegraft) ?? "";
                const price = idToPrice.get(id) ?? 0;
                return {
                    name: t.runegraft,
                    chaosValue: Math.ceil(price),
                    regex: t.regex,
                    description: t.description
                };
            });

            pricedRegex.sort(sortByChaosValue);
            setRunegraftPrices(pricedRegex);
        });

        const tattooData = fetch(`runegraft/tattoos.json`)
            .then((r) => r.json()) as Promise<PoeNinjaTattooData>;

        tattooData.then((d) => {
            const idToName = new Map(d.items.map((i) => [i.id, i.name]));
            const nameToRegex = new Map(tattooRegex.map((t) => [t.tattoo, t]));
            const tattoos: RunegraftPriceRegex[] = d.lines.map((l) => {
                const name = idToName.get(l.id) ?? l.id;
                const tattooInfo = nameToRegex.get(name);
                return {
                    name: name,
                    chaosValue: Math.ceil(l.primaryValue),
                    regex: tattooInfo?.regex ?? name.toLowerCase(),
                    description: tattooInfo?.description ?? "Tattoo"
                };
            });
            setTattooPrices(tattoos);
        }).catch(e => console.error("Failed to load tattoos", e));
    }, [league]);

    useEffect(() => {
        if (priceRangeInitialized) return;
        const range = economyPriceRange(displayedPrices.map((price) => price.chaosValue));
        if (!range) return;
        setMinChaosValue(range.min);
        setMaxChaosValue(range.max);
        setPriceRangeInitialized(true);
    }, [displayedPrices, priceRangeInitialized]);

    useEffect(() => {
        if (priceRangeInitialized) {
            saveSettings({
                ...profile,
                runegraft: {
                    minValue: minChaosValue,
                    maxValue: maxChaosValue,
                    includeTattoos: includeTattoos
                }
            });
        }
        const minChaosN = minChaosValue ? minChaosValue as unknown as number : undefined;
        const maxChaosN = maxChaosValue ? maxChaosValue as unknown as number : undefined;

        let prices = [...runegraftPrices];
        if (includeTattoos) {
            prices = [...prices, ...tattooPrices];
        }
        prices.sort(sortByChaosValue);
        setDisplayedPrices(prices);

        setResult(generateRegex(prices, minChaosN, maxChaosN));
    }, [minChaosValue, maxChaosValue, runegraftPrices, includeTattoos, tattooPrices, priceRangeInitialized]);

    return (
        <>
            <Header text={"Runegraft"}/>
            <RegexResultBox result={result} warning={""} reset={() => {
                const range = economyPriceRange(displayedPrices.map((price) => price.chaosValue));
                setPriceRangeInitialized(range !== undefined);
                setMinChaosValue(range?.min ?? "0");
                setMaxChaosValue(range?.max ?? "");
            }} />
            <p className="runegraft-price-info">Using price data from the {league} League. Last updated: {lastUpdated}</p>
            <div className="filter-card-grid">
                <FilterCard title="Settings">
                    <PriceRangeSlider id="runegraft-price" minValue={minChaosValue} maxValue={maxChaosValue}
                                      onMinChange={(value) => { setPriceRangeInitialized(true); setMinChaosValue(value); }}
                                      onMaxChange={(value) => { setPriceRangeInitialized(true); setMaxChaosValue(value); }}
                                      availablePrices={displayedPrices.map((price) => price.chaosValue)} allowZero/>
                    <div className="runegraft-card-divider"/>
                    <Checkbox label="Include tattoos" value={includeTattoos} onChange={setIncludeTattoos}/>
                </FilterCard>
            </div>
            <div className="row">
                <Collapsable header={"Price data"} isOpenByDefault={true}>
                    <div className="runegraft-row runegraft-header">
                        <div className="runegraft-name-cell">Runegraft name</div>
                        <div className="runegraft-regex-cell">Regex</div>
                        <div className="runegraft-value-cell">Chaos</div>
                        <div className="runegraft-description-cell">Effect</div>
                    </div>
                    {displayedPrices.map((e) => {
                        const highlighted = result.includes(e.regex);
                        const highlightedCss = highlighted ? "runegraft-highlighted" : "";
                        return (
                            <div className={`runegraft-row ${highlightedCss}`} key={e.name}>
                                <div className="runegraft-name-cell" key={e.name}>{e.name}</div>
                                <div className="runegraft-regex-cell">{e.regex}</div>
                                <div className="runegraft-value-cell">{e.chaosValue}</div>
                                <div className="runegraft-description-cell">{e.description}</div>
                            </div>
                        )
                    })}
                </Collapsable>
            </div>
        </>
    );
}

export default Runegraft;
