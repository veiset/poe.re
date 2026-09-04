import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import React, {useContext, useEffect, useState} from "react";
import {loadBeastRegex} from "@poe/utils/loadData";
import type {BeastRegex} from "@poe/types/generated/beast";
import "./Beast.css";
import Collapsable from "@poe/components/collapsable/Collapsable";
import {dateTextFromString} from "../expedition/ExpeditionUtils";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {loadProfiles, loadSettings, updateSettings, valueFromKeyMap} from "@poe/utils/LocalStorage";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import {economyUrl, fetchEconomyFile} from "@shared/economy";
import {usePoe1League} from "@shared/core/LeagueContext";
import PriceRangeSlider from "@shared/components/PriceRangeSlider/PriceRangeSlider";
import {economyPriceRange} from "@poe/utils/EconomyPriceRange";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";

export interface PoeNinjaBeast {
  name: string
  chaosValue: number
  listingCount: number
}

export interface PoeNinjaBeastData {
  lines: PoeNinjaBeast[]
}

interface BeastPriceRegex {
  name: string
  chaosValue: number
  recipe: string
  regex: string
  numberOfBeasts: number
  harvest: boolean
  redBeast: boolean
}

const sortByChaosValue = (e1: BeastPriceRegex, e2: BeastPriceRegex) => e2.chaosValue - e1.chaosValue;

const generateRegex = (
  prices: BeastPriceRegex[],
  includeHarvest: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
  menagerieLimit: boolean,
  redBeastOnly: boolean,
): string => {
  let done = false;
  const regex = prices
    .filter((e) => redBeastOnly ? e.redBeast : true)
    .filter((e) => e.chaosValue > 0)
    .reduce((acc: string, el: BeastPriceRegex) => {
      if (done) {
        return acc;
      }
      if (!includeHarvest && el.harvest) {
        return acc;
      }
      if (acc.length + el.regex.length + 1 > (menagerieLimit ? 100 : 250)) {
        done = true;
        return acc;
      }
      if (el.chaosValue > (maxValue ?? 9999999)) return acc;
      if (el.chaosValue < (minValue ?? 0)) return acc;
      return acc + "|" + el.regex;
    }, "");
  return `${regex.substring(1)}`;
}

const Beast = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("beast", storedProfile.beast);
  const profile = {...storedProfile, beast: favoritePage.initialConfiguration};
  const savedProfile = loadProfiles()[globalProfile];
  const hasSavedPriceRange = React.useRef(
    favoritePage.isEditingFavorite || valueFromKeyMap(savedProfile, "beast.minChaosValue") !== undefined ||
    valueFromKeyMap(savedProfile, "beast.maxChaosValue") !== undefined
  );
  const {league} = usePoe1League();
  const [minChaosValue, setMinChaosValue] = useState<string>(profile.beast.minChaosValue);
  const [maxChaosValue, setMaxChaosValue] = useState<string>(profile.beast.maxChaosValue);
  const [includeHarvest, setIncludeHarvest] = React.useState(profile.beast.includeHarvest);
  const [menagerieLimit, setMenagerieLimit] = useState(profile.beast.menagerieLimit);
  const [redBeastsOnly, setRedBeastsOnly] = useState(profile.beast.redBeastsOnly);

  const [beastPrices, setBeastPrices] = useState<BeastPriceRegex[]>([]);
  const [beastRegex, setBeastRegex] = useState<BeastRegex>([]);
  const [lastUpdated, setLastUpdated] = useState("Outdated prices. Check back in a few mins...");
  const [result, setResult] = useState<string>("");
  const [priceRangeInitialized, setPriceRangeInitialized] = useState(hasSavedPriceRange.current);
  const settings = {includeHarvest, minChaosValue, maxChaosValue, menagerieLimit, redBeastsOnly};

  useEffect(() => {
    loadBeastRegex().then(setBeastRegex);
  }, []);

  useEffect(() => {
    if (!league) return;
    fetch(economyUrl("generated.txt"))
      .then((r) => r.text())
      .then((date) => {
        setLastUpdated(dateTextFromString(date));
      });
    const data = fetchEconomyFile<PoeNinjaBeastData>("beast", league, "Beast");

    data.then((d) => {
      const priceLookup = new Map(d.lines.map((b) => [b.name, b.chaosValue]));
      const lookup = new Map(d.lines.map((b) => [b.name, b]));
      const pricedRegex: BeastPriceRegex[] = beastRegex.map((b) =>
        ({
          name: b.beast,
          chaosValue: priceLookup.get(b.beast) ?? 0,
          recipe: b.recipe,
          regex: b.regex,
          numberOfBeasts: lookup.get(b.beast)?.listingCount ?? 0,
          harvest: b.harvest,
          redBeast: b.red,
        })
      )
        .filter((e) => e.numberOfBeasts > 5); // filter price fixing, or very low amount of beasts
      pricedRegex.sort(sortByChaosValue);

      setBeastPrices(pricedRegex);
    });
  }, [league, beastRegex]);

  useEffect(() => {
    if (priceRangeInitialized) return;
    const range = economyPriceRange(beastPrices.map((beast) => beast.chaosValue));
    if (!range) return;
    setMinChaosValue(range.min);
    setMaxChaosValue(range.max);
    setPriceRangeInitialized(true);
  }, [beastPrices, priceRangeInitialized]);

  useEffect(() => {
    if (priceRangeInitialized) {
      if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, beast: settings}));
    }
    const minChaosN = minChaosValue ? minChaosValue as unknown as number : undefined;
    const maxChaosN = maxChaosValue ? maxChaosValue as unknown as number : undefined;
    setResult(generateRegex(beastPrices, includeHarvest, minChaosN, maxChaosN, menagerieLimit, redBeastsOnly));
  }, [includeHarvest, minChaosValue, maxChaosValue, beastPrices, menagerieLimit, redBeastsOnly, priceRangeInitialized]);

  return (
    <>
      <Header text={"Bestiary"}/>
      <RegexResultBox result={result} warning={""} maxLength={(menagerieLimit ? 100 : 250)} favorite={favoritePage.action(settings, {language: storedProfile.language, league}, !priceRangeInitialized || beastPrices.length === 0 ? "Economy data is still loading." : undefined)} reset={() => {
        const range = economyPriceRange(beastPrices.map((beast) => beast.chaosValue));
        setIncludeHarvest(defaultSettings.beast.includeHarvest);
        setPriceRangeInitialized(range !== undefined);
        setMinChaosValue(range?.min ?? "0");
        setMaxChaosValue(range?.max ?? "");
        setMenagerieLimit(defaultSettings.beast.menagerieLimit);
      }}/>
      <p className="beast-price-info">Using price data from the {league} League. Last updated: {lastUpdated}</p>
      <div className="filter-card-grid">
        <FilterCard title="Settings">
          <PriceRangeSlider id="beast-price" minValue={minChaosValue} maxValue={maxChaosValue}
                            onMinChange={(value) => { setPriceRangeInitialized(true); setMinChaosValue(value); }}
                            onMaxChange={(value) => { setPriceRangeInitialized(true); setMaxChaosValue(value); }}
                            availablePrices={beastPrices.map((beast) => beast.chaosValue)} allowZero/>
          <div className="beast-card-divider"/>
          <Checkbox label="Include harvest beasts" value={includeHarvest} onChange={setIncludeHarvest}/>
          <Checkbox label="Use menagerie regex character limit (100)" value={menagerieLimit}
                    onChange={setMenagerieLimit}/>
          <Checkbox label="Show red beasts only" value={redBeastsOnly} onChange={setRedBeastsOnly}/>
        </FilterCard>
      </div>
      <div className="row">
        <Collapsable header={"Price data"} isOpenByDefault={true}>
          <div className="beast-row beast-header">
            <div className="beast-name-cell">Beast name</div>
            <div className="beast-regex-cell">Regex</div>
            <div className="beast-value-cell">Chaos</div>
            <div className="beast-recipe-cell">Recipe</div>
          </div>
          {beastPrices.filter((e) => redBeastsOnly ? e.redBeast : true).sort(sortByChaosValue).map((e) => {
            const highlighted = result.includes(e.regex);
            const hiddenHarvest = !includeHarvest && e.harvest ? "hidden-beast" : "";
            const highlightedCss = highlighted && !hiddenHarvest ? "beast-highlighted" : "";
            return (
              <div className={`beast-row ${highlightedCss} ${hiddenHarvest}`} key={e.name}>
                <div className="beast-name-cell" key={e.name}>{e.name}</div>
                <div className="beast-regex-cell">{e.regex}</div>
                <div className="beast-value-cell">{e.chaosValue}</div>
                <div className="beast-recipe-cell">{e.recipe}</div>
              </div>
            )
          })}
        </Collapsable>
      </div>
    </>
  );
}

export default Beast;
