import React, {useContext, useEffect, useMemo, useState} from "react";
import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import PriceRangeSlider from "@shared/components/PriceRangeSlider/PriceRangeSlider";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {defaultSettings, GemsSettings} from "@poe/utils/SavedSettings";
import {loadGems} from "@poe/utils/loadData";
import type {GemsRegex} from "@poe/types/generated/gems";
import {generateNumberRangeRegex} from "@shared/core/regex/GenerateNumberRegex";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";
import GemNameList from "../vendor/GemNameList";
import "./Gems.css";

const gemLevels = Array.from({length: 21}, (_, index) => index + 1);
const gemQualities = Array.from({length: 24}, (_, index) => index);

const boundedValue = (value: string, low: number, high: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return low;
  return Math.max(low, Math.min(high, parsed));
};

const rangeRegex = (min: string, max: string, low: number, high: number, prefix: string, suffix = "") => {
  const start = boundedValue(min, low, high);
  const end = boundedValue(max, low, high);
  if (end < start) return "";
  return `${prefix}${generateNumberRangeRegex(String(start), String(end), false)}${suffix}`;
};

const generateGemsRegex = (settings: GemsSettings, gems?: GemsRegex) => {
  const names = gems?.tokens
    .filter((gem) => settings.selected.includes(gem.id))
    .map((gem) => gem.regex) ?? [];
  const nameRegex = names.length === 0 ? "" : names.length === 1 ? names[0] : `(${names.join("|")})`;
  const levelValueRegex = rangeRegex(settings.levelMin, settings.levelMax, 1, 21, "level: ");
  const qualityValueRegex = rangeRegex(settings.qualityMin, settings.qualityMax, 0, 23, "quality: \\+", "%");
  const levelRegex = settings.levelEnabled && levelValueRegex ? `"${levelValueRegex}"` : "";
  const qualityRegex = settings.qualityEnabled && qualityValueRegex ? `"${qualityValueRegex}"` : "";
  return [nameRegex, levelRegex, qualityRegex].filter(Boolean).join(" ");
};

const Gems = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("gems", storedProfile.gems);
  const profile = {...storedProfile, gems: favoritePage.initialConfiguration};
  const [gems, setGems] = useState<GemsRegex>();
  const [levelEnabled, setLevelEnabled] = useState(profile.gems.levelEnabled);
  const [levelMin, setLevelMin] = useState(profile.gems.levelMin);
  const [levelMax, setLevelMax] = useState(profile.gems.levelMax);
  const [qualityEnabled, setQualityEnabled] = useState(profile.gems.qualityEnabled);
  const [qualityMin, setQualityMin] = useState(profile.gems.qualityMin);
  const [qualityMax, setQualityMax] = useState(profile.gems.qualityMax);
  const [showSkills, setShowSkills] = useState(profile.gems.showSkills);
  const [showSupports, setShowSupports] = useState(profile.gems.showSupports);
  const [selected, setSelected] = useState(profile.gems.selected);

  useEffect(() => { loadGems().then(setGems); }, []);

  const settings: GemsSettings = {levelEnabled, levelMin, levelMax, qualityEnabled, qualityMin, qualityMax, showSkills, showSupports, selected};
  const result = useMemo(() => generateGemsRegex(settings, gems), [settings, gems]);

  useEffect(() => {
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, gems: settings}));
  }, [levelEnabled, levelMin, levelMax, qualityEnabled, qualityMin, qualityMax, showSkills, showSupports, selected]);

  return <>
    <Header text="Gems"/>
    <RegexResultBox result={result} warning={undefined}
                    favorite={favoritePage.action(settings, {language: storedProfile.language})}
                    reset={() => {
                      const defaults = defaultSettings.gems;
                      setLevelEnabled(defaults.levelEnabled);
                      setLevelMin(defaults.levelMin); setLevelMax(defaults.levelMax);
                      setQualityEnabled(defaults.qualityEnabled);
                      setQualityMin(defaults.qualityMin); setQualityMax(defaults.qualityMax);
                      setShowSkills(defaults.showSkills); setShowSupports(defaults.showSupports);
                      setSelected(defaults.selected);
                    }}/>
    <div className="filter-card-grid">
      <FilterCard title="Gem level" headerControl={<Checkbox label="Enable" value={levelEnabled} onChange={setLevelEnabled}/>}
                  disabled={!levelEnabled}>
        <PriceRangeSlider id="gem-level" minValue={levelMin} maxValue={levelMax}
                          onMinChange={setLevelMin} onMaxChange={setLevelMax}
                          availablePrices={gemLevels} unit="level"/>
      </FilterCard>
      <FilterCard title="Gem quality" headerControl={<Checkbox label="Enable" value={qualityEnabled} onChange={setQualityEnabled}/>}
                  disabled={!qualityEnabled}>
        <PriceRangeSlider id="gem-quality" minValue={qualityMin} maxValue={qualityMax}
                          onMinChange={setQualityMin} onMaxChange={setQualityMax}
                          availablePrices={gemQualities} unit="%" allowZero/>
      </FilterCard>
      <FilterCard title="Gem type">
        <Checkbox label="Skills" value={showSkills} onChange={setShowSkills}/>
        <Checkbox label="Supports" value={showSupports} onChange={setShowSupports}/>
      </FilterCard>
    </div>
    <div className="gems-card">
      <div className="gems-card-header"><span className="gems-card-title">Gems</span></div>
      <GemNameList id="gems-name-list" gems={gems?.tokens ?? []} selected={selected} setSelected={setSelected}
                   filter={(gem) => gem.options.support ? showSupports : showSkills}/>
    </div>
  </>;
};

export default Gems;
