import React, {useContext, useEffect, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadProfiles, loadSettings, saveSettings, valueFromKeyMap} from "@poe/utils/LocalStorage";
import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import "./Scarab.css";
import {Scarab, scarabs} from "@poe/generated/GeneratedScarabs";
import ScarabElement from "./ScarabElement";
import {dateTextFromString} from "../expedition/ExpeditionUtils";
import ModSearchBox from "@shared/components/ModSearchBox";
import {defaultSettings, ScarabSettings} from "@poe/utils/SavedSettings";
import {generateScarabRegex} from "./ScarabOutput";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import {economyUrl, fetchEconomyFile} from "@shared/economy";
import {usePoe1League} from "@shared/core/LeagueContext";
import PriceRangeSlider from "@poe/components/PriceRangeSlider/PriceRangeSlider";
import {economyPriceRange} from "@poe/utils/EconomyPriceRange";

export interface PoeNinjaScarabLine {
  id: string
  primaryValue: number
}

export interface PoeNinjaScarabItem {
  id: string
  name: string
}

export interface PoeNinjaScarabData {
  lines: PoeNinjaScarabLine[]
  items: PoeNinjaScarabItem[]
}

const sortByChaosValue = (prices: Map<string, number>, e1: Scarab, e2: Scarab) => {
  const chaosValue1 = prices.get(e1.name) ?? 0;
  const chaosValue2 = prices.get(e2.name) ?? 0;
  return chaosValue2 - chaosValue1;
}

const Scarabs = () => {
  const {globalProfile} = useContext(ProfileContext);
  const profile = loadSettings(globalProfile);
  const savedProfile = loadProfiles()[globalProfile];
  const hasSavedPriceRange = React.useRef(
    valueFromKeyMap(savedProfile, "scarab.minPrice") !== undefined ||
    valueFromKeyMap(savedProfile, "scarab.maxPrice") !== undefined
  );
  const {league} = usePoe1League();

  const scarabNames = Array.from(Object.keys(scarabs));
  const scarabList = scarabNames.map((s) => ({...scarabs[s]}));
  const [minPrice, setMinPrice] = useState(profile.scarab.minPrice);
  const [maxPrice, setMaxPrice] = useState(profile.scarab.maxPrice);
  const [lastUpdated, setLastUpdated] = useState("Outdated prices. Check back in a few mins...");
  const [priceLookup, setPriceLookup] = useState(new Map<string, number>());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(profile.scarab.selected.filter((e) => scarabNames.includes(e)));

  const [result, setResult] = useState("");
  const [priceRangeInitialized, setPriceRangeInitialized] = useState(hasSavedPriceRange.current);

  useEffect(() => {
    if (!league) return;
    fetch(economyUrl("generated.txt"))
      .then((r) => r.text())
      .then((date) => {
        setLastUpdated(dateTextFromString(date));
      });

    const data = fetchEconomyFile<PoeNinjaScarabData>("scarab", league, "Scarab");

    data.then((d) => {
      const idToName = new Map(d.items.map((i) => [i.id, i.name]));
      const idToPrice = new Map(d.lines.map((l) => [l.id, l.primaryValue]));

      setPriceLookup(
        new Map(d.lines.map((b) => [idToName.get(b.id) || "unknown", idToPrice.get(b.id) ?? 0]))
      );
    })
  }, [league]);

  useEffect(() => {
    if (priceRangeInitialized) return;
    const range = economyPriceRange(Array.from(priceLookup.values()));
    if (!range) return;
    setMinPrice(range.min);
    setMaxPrice(range.max);
    setPriceRangeInitialized(true);
  }, [priceLookup, priceRangeInitialized]);

  useEffect(() => {
    const settings: ScarabSettings = {minPrice, maxPrice, selected,};
    if (priceRangeInitialized) saveSettings({...profile, scarab: {...settings}});
    setResult(generateScarabRegex(settings));
  }, [minPrice, maxPrice, selected, priceRangeInitialized]);


  return (
    <>
      <Header text={"Scarab"}/>
      <RegexResultBox
        result={result}
        warning={undefined}
        reset={() => {
          const range = economyPriceRange(Array.from(priceLookup.values()));
          setSelected(defaultSettings.scarab.selected);
          setPriceRangeInitialized(range !== undefined);
          setMinPrice(range?.min ?? "0");
          setMaxPrice(range?.max ?? "");
        }}
      />
      <div className="break"/>
      <p className="scarab-price-info">Using price data from the {league} League. Last updated: {lastUpdated}</p>
      <div className="filter-card-grid">
        <FilterCard title="Auto select">
          <div className="scarab-options-row">
            <button className="scarab-action-button" onClick={() => {
              const matchingScarabs = scarabList
                .filter((scarab) => {
                  const priceOfScarab = priceLookup.get(scarab.name);
                  if (priceOfScarab === undefined) return false;
                  const withinMaxPrice = Number(maxPrice) >= priceOfScarab;
                  const withinMinPrice = Number(minPrice) <= priceOfScarab;
                  return withinMinPrice && withinMaxPrice;
                })
                .map((e) => e.name);
              setSelected(matchingScarabs);
            }}>
              Auto select cheap scarabs between:
            </button>
            <PriceRangeSlider id="scarab-price" minValue={minPrice} maxValue={maxPrice}
                              onMinChange={(value) => { setPriceRangeInitialized(true); setMinPrice(value); }}
                              onMaxChange={(value) => { setPriceRangeInitialized(true); setMaxPrice(value); }}
                              availablePrices={Array.from(priceLookup.values())} allowZero/>
          </div>
        </FilterCard>
      </div>

      <div className="scarab-card">
        <div className="scarab-card-header">
          <span className="scarab-card-title">Scarabs</span>
        </div>
        <div className="scarab-search">
          <ModSearchBox id="scarab-search-box" search={search} setSearch={setSearch}
                        placeholder={"Search for a Scarab..."}/>
        </div>
        <div className="scarab-list">
          {scarabList
            .filter((e) => search.length < 2 || e.name.toLowerCase().includes(search.toLowerCase()))
            .sort((e1, e2) => sortByChaosValue(priceLookup, e1, e2))
            .map((scarab) => {
              const isSelected = selected.includes(scarab.name);
              const price = priceLookup.get(scarab.name) ?? 0;
              return (
                <ScarabElement
                  key={scarab.name}
                  selected={selected}
                  setSelected={setSelected}
                  isSelected={isSelected}
                  scarab={scarab}
                  price={price}
                />)
            })}
        </div>
      </div>
    </>
  );
}

export default Scarabs;
