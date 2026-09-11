import {HeaderWithLanguage} from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import React, {useContext, useEffect, useState} from "react";
import {loadBeastRegex} from "@poe/utils/loadData";
import type {BeastRegex} from "@poe/types/generated/beast";
import "./Beast.css";
import "@shared/components/dropdown/Dropdown.css";
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
  group: string
  family: string
}

const sortByChaosValue = (e1: BeastPriceRegex, e2: BeastPriceRegex) => e2.chaosValue - e1.chaosValue;

interface RegexBatch {
  regex: string
  nextOffset: number
  hasMore: boolean
}

const generateRegexBatch = (
  prices: BeastPriceRegex[],
  includeHarvest: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
  showRedBeasts: boolean,
  showYellowBeasts: boolean,
  selectedGroup: string,
  selectedFamily: string,
  offset: number,
): RegexBatch => {
  const matchingPrices = prices
    .filter((e) => e.redBeast ? showRedBeasts : showYellowBeasts)
    .filter((e) => !selectedGroup || e.group === selectedGroup)
    .filter((e) => !selectedFamily || e.family === selectedFamily)
    .filter((e) => e.chaosValue > 0)
    .filter((e) => includeHarvest || !e.harvest)
    .filter((e) => e.chaosValue <= (maxValue ?? Infinity))
    .filter((e) => e.chaosValue >= (minValue ?? 0));
  let regex = "";
  let nextOffset = offset;

  for (let index = offset; index < matchingPrices.length; index += 1) {
    const nextRegex = regex ? `${regex}|${matchingPrices[index].regex}` : matchingPrices[index].regex;
    if (nextRegex.length > 250) break;
    regex = nextRegex;
    nextOffset = index + 1;
  }

  return {regex, nextOffset, hasMore: nextOffset < matchingPrices.length};
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
  const legacyRedBeastsOnly = (profile.beast as typeof profile.beast & {redBeastsOnly?: boolean}).redBeastsOnly;
  const [minChaosValue, setMinChaosValue] = useState<string>(profile.beast.minChaosValue);
  const [maxChaosValue, setMaxChaosValue] = useState<string>(profile.beast.maxChaosValue);
  const [includeHarvest, setIncludeHarvest] = React.useState(profile.beast.includeHarvest);
  const [showRedBeasts, setShowRedBeasts] = useState(legacyRedBeastsOnly === undefined ? profile.beast.showRedBeasts : true);
  const [showYellowBeasts, setShowYellowBeasts] = useState(legacyRedBeastsOnly === undefined ? profile.beast.showYellowBeasts : !legacyRedBeastsOnly);
  const [selectedGroup, setSelectedGroup] = useState(profile.beast.selectedGroup);
  const [selectedFamily, setSelectedFamily] = useState(profile.beast.selectedFamily);
  const [beastOffset, setBeastOffset] = useState(profile.beast.beastOffset);

  const [beastPrices, setBeastPrices] = useState<BeastPriceRegex[]>([]);
  const [beastRegex, setBeastRegex] = useState<BeastRegex>([]);
  const [englishBeastNames, setEnglishBeastNames] = useState<Map<number, string>>(new Map());
  const [economyData, setEconomyData] = useState<PoeNinjaBeastData>();
  const [lastUpdated, setLastUpdated] = useState("Outdated prices. Check back in a few mins...");
  const [result, setResult] = useState<string>("");
  const [priceRangeInitialized, setPriceRangeInitialized] = useState(hasSavedPriceRange.current);
  const previousFilterKey = React.useRef<string | undefined>(undefined);
  const settings = {beastOffset, includeHarvest, minChaosValue, maxChaosValue, showRedBeasts, showYellowBeasts, selectedGroup, selectedFamily};
  const minChaosN = minChaosValue ? minChaosValue as unknown as number : undefined;
  const maxChaosN = maxChaosValue ? maxChaosValue as unknown as number : undefined;
  const regexBatch = generateRegexBatch(
    beastPrices, includeHarvest, minChaosN, maxChaosN, showRedBeasts, showYellowBeasts, selectedGroup, selectedFamily, beastOffset,
  );
  const groups = Array.from(new Set(beastRegex.map((beast) => beast.group))).sort();
  const families = Array.from(new Set(beastRegex.map((beast) => beast.family))).sort();

  useEffect(() => {
    let isCurrentLanguage = true;
    loadBeastRegex(profile.language).then((beasts) => {
      if (isCurrentLanguage) setBeastRegex(beasts);
    });
    return () => {
      isCurrentLanguage = false;
    };
  }, [profile.language]);

  useEffect(() => {
    loadBeastRegex("ENGLISH").then((beasts) => {
      setEnglishBeastNames(new Map(beasts.map((beast) => [beast.id, beast.beast])));
    });
  }, []);

  useEffect(() => {
    if (!league) return;
    fetch(economyUrl("generated.txt"))
      .then((r) => r.text())
      .then((date) => {
        setLastUpdated(dateTextFromString(date));
      });
    fetchEconomyFile<PoeNinjaBeastData>("beast", league, "Beast").then(setEconomyData);
  }, [league]);

  useEffect(() => {
    if (!economyData || englishBeastNames.size === 0) return;
    const priceLookup = new Map(economyData.lines.map((beast) => [beast.name, beast.chaosValue]));
    const lookup = new Map(economyData.lines.map((beast) => [beast.name, beast]));
    const pricedRegex: BeastPriceRegex[] = beastRegex.map((b) =>
      ({
        name: b.beast,
        chaosValue: priceLookup.get(englishBeastNames.get(b.id) ?? "") ?? 0,
        recipe: b.recipe,
        regex: b.regex,
        numberOfBeasts: lookup.get(englishBeastNames.get(b.id) ?? "")?.listingCount ?? 0,
        harvest: b.harvest,
        redBeast: b.red,
        group: b.group,
        family: b.family,
      })
    )
      .filter((e) => e.numberOfBeasts > 5); // filter price fixing, or very low amount of beasts
    pricedRegex.sort(sortByChaosValue);

    setBeastPrices(pricedRegex);
  }, [beastRegex, economyData, englishBeastNames]);

  useEffect(() => {
    if (priceRangeInitialized) return;
    const range = economyPriceRange(beastPrices.map((beast) => beast.chaosValue));
    if (!range) return;
    setMinChaosValue(range.min);
    setMaxChaosValue(range.max);
    setPriceRangeInitialized(true);
  }, [beastPrices, priceRangeInitialized]);

  useEffect(() => {
    const filterKey = JSON.stringify({includeHarvest, minChaosValue, maxChaosValue, showRedBeasts, showYellowBeasts, selectedGroup, selectedFamily});
    if (previousFilterKey.current === undefined) {
      previousFilterKey.current = filterKey;
      return;
    }
    if (previousFilterKey.current !== filterKey) {
      previousFilterKey.current = filterKey;
      setBeastOffset(0);
    }
  }, [includeHarvest, minChaosValue, maxChaosValue, showRedBeasts, showYellowBeasts, selectedGroup, selectedFamily]);

  useEffect(() => {
    if (priceRangeInitialized) {
      if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, beast: settings}));
    }
  }, [beastOffset, includeHarvest, minChaosValue, maxChaosValue, showRedBeasts, showYellowBeasts, selectedGroup, selectedFamily, priceRangeInitialized]);

  useEffect(() => {
    setResult(regexBatch.regex);
  }, [regexBatch.regex]);

  return (
    <>
      <HeaderWithLanguage text={"Bestiary"}/>
      <RegexResultBox result={result} warning={""} maxLength={250} favorite={favoritePage.action(settings, {language: storedProfile.language, league}, !priceRangeInitialized || beastPrices.length === 0 ? "Economy data is still loading." : undefined)} reset={() => {
        const range = economyPriceRange(beastPrices.map((beast) => beast.chaosValue));
        setIncludeHarvest(defaultSettings.beast.includeHarvest);
        setPriceRangeInitialized(range !== undefined);
        setMinChaosValue(range?.min ?? "0");
        setMaxChaosValue(range?.max ?? "");
        setShowRedBeasts(defaultSettings.beast.showRedBeasts);
        setShowYellowBeasts(defaultSettings.beast.showYellowBeasts);
        setSelectedGroup(defaultSettings.beast.selectedGroup);
        setSelectedFamily(defaultSettings.beast.selectedFamily);
        setBeastOffset(0);
      }}/>
      <p className="beast-price-info">Using price data from the {league} League. Last updated: {lastUpdated}</p>
      <div className="filter-card-grid">
        <FilterCard title="Settings">
          <div className="beast-price-controls">
            <PriceRangeSlider id="beast-price" minValue={minChaosValue} maxValue={maxChaosValue}
                              onMinChange={(value) => { setPriceRangeInitialized(true); setMinChaosValue(value); }}
                              onMaxChange={(value) => { setPriceRangeInitialized(true); setMaxChaosValue(value); }}
                              availablePrices={beastPrices.map((beast) => beast.chaosValue)} allowZero/>
            <button className="beast-next-button" disabled={!regexBatch.regex}
                    onClick={() => setBeastOffset(regexBatch.hasMore ? regexBatch.nextOffset : 0)}>
              Next batch
            </button>
          </div>
          <div className="beast-card-divider"/>
          <Checkbox label="Include harvest beasts" value={includeHarvest} onChange={setIncludeHarvest}/>
          <Checkbox label="Show red beasts" value={showRedBeasts} onChange={setShowRedBeasts}/>
          <Checkbox label="Show yellow beasts" value={showYellowBeasts} onChange={setShowYellowBeasts}/>
          <div className="beast-attribute-filters">
            <label>
              Group
              <select className="dropdown-select" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
                <option value="">All groups</option>
                {groups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>
            <label>
              Family
              <select className="dropdown-select" value={selectedFamily} onChange={(event) => setSelectedFamily(event.target.value)}>
                <option value="">All families</option>
                {families.map((family) => <option key={family} value={family}>{family}</option>)}
              </select>
            </label>
          </div>
        </FilterCard>
      </div>
      <div className="row">
        <Collapsable header={"Price data"} isOpenByDefault={true}>
          <div className="beast-row beast-header">
            <div className="beast-name-cell">Beast name</div>
            <div className="beast-group-cell">Group</div>
            <div className="beast-family-cell">Family</div>
            <div className="beast-value-cell">Chaos</div>
            <div className="beast-recipe-cell">Recipe</div>
          </div>
          {beastPrices.filter((e) => (e.redBeast ? showRedBeasts : showYellowBeasts) && (!selectedGroup || e.group === selectedGroup) && (!selectedFamily || e.family === selectedFamily)).sort(sortByChaosValue).map((e) => {
            const highlighted = result.includes(e.regex);
            const hiddenHarvest = !includeHarvest && e.harvest ? "hidden-beast" : "";
            const highlightedCss = highlighted && !hiddenHarvest ? "beast-highlighted" : "";
            return (
              <div className={`beast-row ${highlightedCss} ${hiddenHarvest}`} key={e.name}>
                <div className="beast-name-cell" key={e.name}>{e.name}</div>
                <div className="beast-group-cell">{e.group}</div>
                <div className="beast-family-cell">{e.family}</div>
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
