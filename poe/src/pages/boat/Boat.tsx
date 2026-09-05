import React, {useEffect, useState} from "react";
import {useContext} from "react";
import {HeaderWithLanguage} from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import SelectableTokenList from "@poe/components/SelectableTokenList/SelectableTokenList";
import type {BoatModsRegex, MapOption, Token} from "@poe/types/generated/boatmods";
import {loadBoatMods} from "@poe/utils/loadData";
import {generateBoatModRegex} from "./BoatOutput";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import IncludeExcludeToggle from "@poe/components/IncludeExcludeToggle/IncludeExcludeToggle";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {BoatSettings, defaultSettings} from "@poe/utils/SavedSettings";
import "../maps/OptimizedMapMods.css";
import "../boat/Boat.css";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";

const boatAreaOptions = [
  {
    regex: "Diving Shoals",
    description: "Area has a Trathen mercenary encounter unique to here",
  },
  {
    regex: "Pelagic Abyss",
    description: "Area contains a big abyssal pit that spawns abyss monster which have a chance to drop Merrick's Ducat",
  },
  {
    regex: "Sea Pillars",
    description: "Area contains sea pillars which have 1 rare enemy each",
  },
  {
    regex: "Sunken Totems",
    description: "Area contains spirits of the Ancestors. The bosses from the Trial of the Ancestors.",
  },
  {
    regex: "Brine King's Domain",
    description: "Rare monsters within are have \"The Pantheon\" Brine King mod",
  },
  {
    regex: "Clam-Infested shelf",
    description: "Area contains large amount of Treasure clams",
  },
  {
    regex: "Kishara's rest",
    description: "Let's you fight Velka in a voyage",
  },
  {
    regex: "Lost Ruins",
    description: "Area contains Vaal Vessels",
  },
  {
    regex: "Anchorfield",
    description: "Area contains Sunken Loot",
  },
  {
    regex: "Infested Bathyspheres",
    description: "Area contains random rewards (sunken loot, gold)",
  },
  {
    regex: "Eldritch Depths",
    description: "Area contains scary monsters",
  },
];

const Boat = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("boat", storedProfile.boat);
  const profile = {...storedProfile, boat: favoritePage.initialConfiguration};

  const [result, setResult] = useState("");
  const [regexBoatMods, setRegexBoatMods] = useState<BoatModsRegex>();
  const [selectedGoodIds, setSelectedGoodIds] = useState<number[]>(profile.boat.selectedGoodIds);
  const [allGoodMods, setAllGoodMods] = useState(profile.boat.allGoodMods);
  const [adjacentModifier, setAdjacentModifier] = useState(profile.boat.adjacentModifier);
  const [selectedAreaRegexes, setSelectedAreaRegexes] = useState<string[]>(profile.boat.selectedAreaRegexes);
  const [customTextStr, setCustomTextStr] = useState(profile.boat.customText.value);
  const [enableCustomText, setEnableCustomText] = useState(profile.boat.customText.enabled);

  const settings: BoatSettings = {
    selectedGoodIds, allGoodMods, adjacentModifier, selectedAreaRegexes,
    customText: {value: customTextStr, enabled: enableCustomText},
  };

  useEffect(() => {
    loadBoatMods().then(setRegexBoatMods);
  }, []);

  useEffect(() => {
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, boat: {...settings}}));

    if (!regexBoatMods) return;
    setResult(generateBoatModRegex(
      selectedGoodIds,
      allGoodMods,
      regexBoatMods,
      adjacentModifier.enabled && adjacentModifier.include,
      adjacentModifier.enabled && !adjacentModifier.include,
      selectedAreaRegexes,
    ));
  }, [selectedGoodIds, allGoodMods, adjacentModifier, selectedAreaRegexes, customTextStr, enableCustomText, regexBoatMods]);

  const renderAffixTag = (token: Token<MapOption>) => (
    <span className={`mod-affix-tag mod-affix-tag--${token.options.prefix ? "prefix" : "suffix"}`}>
      {token.options.prefix ? "P" : "S"}
    </span>
  );

  const affixGroupFn = (token: Token<MapOption>) =>
    token.options.prefix
      ? {key: "prefix", label: "Prefix"}
      : {key: "suffix", label: "Suffix"};

  return (
    <>
      <HeaderWithLanguage text={"Boat Modifiers"}/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings, {language: storedProfile.language})}
        warning={undefined}
        enableBug={true}
        customText={customTextStr}
        setCustomText={setCustomTextStr}
        enableCustomText={enableCustomText}
        setEnableCustomText={setEnableCustomText}
        reset={() => {
          setSelectedGoodIds(defaultSettings.boat.selectedGoodIds);
          setAllGoodMods(defaultSettings.boat.allGoodMods);
          setAdjacentModifier(defaultSettings.boat.adjacentModifier);
          setSelectedAreaRegexes(defaultSettings.boat.selectedAreaRegexes);
          setEnableCustomText(defaultSettings.boat.customText.enabled);
          setCustomTextStr(defaultSettings.boat.customText.value);
        }}
      />

      <div className="break"/>
      <div className="filter-card-grid">
        <FilterCard title="Boat Areas">
          {boatAreaOptions.map((option) => (
            <Checkbox
              key={option.regex}
              label={<><span className="chart-area-color">{option.regex}</span> | {option.description}</>}
              value={selectedAreaRegexes.includes(option.regex)}
              onChange={(checked) => {
                if (checked) {
                  setSelectedAreaRegexes([...selectedAreaRegexes, option.regex]);
                } else {
                  setSelectedAreaRegexes(selectedAreaRegexes.filter((selected) => selected !== option.regex));
                }
              }}
            />
          ))}
        </FilterCard>
        <FilterCard title="Boat Config">
          <div className={`mm-state-row${adjacentModifier.enabled ? "" : " mm-state-row-off"}`}>
            <Checkbox label="Filter adjacent modifier"
                      value={adjacentModifier.enabled}
                      onChange={() => setAdjacentModifier({...adjacentModifier, enabled: !adjacentModifier.enabled})}/>
            <IncludeExcludeToggle name="boat-adjacent"
                                  include={adjacentModifier.include}
                                  setInclude={(v) => setAdjacentModifier({...adjacentModifier, include: v})}/>
          </div>
        </FilterCard>
      </div>

      <div className="mm-mod-picker">
        <div className="mm-mod-column">
          <div className="mm-mod-column-header">
            <span className="mm-mod-column-title mm-mod-column-title-good">I want these mods</span>
            <div className="mm-mod-grouping">
              <span className="mm-mod-grouping-label">Match</span>
              <div className="radio-button-modgroup">
                <input type="radio" className="radio-button-map" id="boat-mods-any" name="boat-mods" value="any"
                       checked={!allGoodMods}
                       onChange={v => setAllGoodMods(!v.target.checked)}/>
                <label htmlFor="boat-mods-any" className="radio-button-map radio-first-ele">Any</label>
                <input type="radio" id="boat-mods-all" name="boat-mods" value="all" checked={allGoodMods}
                       onChange={v => setAllGoodMods(v.target.checked)}/>
                <label htmlFor="boat-mods-all" className="radio-button-map">All</label>
              </div>
            </div>
          </div>
          <SelectableTokenList
            sortFn={(a, b) => a.options.scary - b.options.scary}
        elements={regexBoatMods?.tokens ?? []}
            setSelected={setSelectedGoodIds}
            selected={selectedGoodIds}
            tagFn={renderAffixTag}
            groupFn={affixGroupFn}
            groupOrder={["prefix", "suffix"]}
          />
        </div>
      </div>
    </>
  )
}

export default Boat;
