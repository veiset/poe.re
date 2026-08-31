import React, {useContext, useEffect, useState} from "react";
import {loadSettings, saveSettings, setSelectedProfile} from "../../localStorage";
import {Poe2ProfileContext} from "../../layout/Poe2ProfileContext";
import {defaultSettings, SelectOption, Settings} from "../../settings";
import {SelectList} from "@poe2/components/SelectList";
import {relicRegex} from "../../generated/Relic.Gen";
import {generateRelicResult} from "./RelicResult";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import Poe2Header from "@poe2/components/Poe2Header";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import {useFavoritePage} from "@poe2/useFavoritePage";

export function Relic() {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const globalSettings = loadSettings(currentProfile)
  const favoritePage = useFavoritePage("relic", globalSettings.relic);
  const [settings, setSettings] = useState<Settings["relic"]>(favoritePage.initialConfiguration);
  const [result, setResult] = useState("");

  const prefixes: SelectOption[] = relicRegex
    .filter((e) => e.affix === "PREFIX")
    .map((mod) => ({
      name: mod.name,
      isSelected: false,
      value: null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  const suffixes: SelectOption[] = relicRegex
    .filter((e) => e.affix === "SUFFIX")
    .map((mod) => ({
      name: mod.name,
      isSelected: false,
      value: null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  useEffect(() => {
    if (favoritePage.isEditingFavorite) { setResult(generateRelicResult({...loadSettings(currentProfile), relic: settings})); return; }
    const base = loadSettings(currentProfile);
    const settingsResult = {...base, relic: {...settings}, name: currentProfile};
    saveSettings(settingsResult);
    setResult(generateRelicResult(settingsResult));
  }, [settings, favoritePage.isEditingFavorite]);

  useEffect(() => {
    if (favoritePage.isEditingFavorite) return;
    const gs = loadSettings(currentProfile);
    setSettings(gs.relic);
    setResult(generateRelicResult(gs));
    setSelectedProfile(currentProfile);
  }, [currentProfile, favoritePage.isEditingFavorite]);

  return (
    <>
      <Poe2Header text="Relic"/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings)}
        reset={() => setSettings(defaultSettings.relic)}
        customText={settings.resultSettings.customText}
        enableCustomText={settings.resultSettings.customTextEnabled}
        autoCopy={settings.resultSettings.autoCopy}
        setCustomText={(text) => {
          setSettings({
            ...settings, resultSettings: {...settings.resultSettings, customText: text,}
          })
        }}
        onAutoCopyChange={(enable: boolean) => {
          setSettings({
            ...settings, resultSettings: {...settings.resultSettings, autoCopy: enable,}
          })
        }}
        setEnableCustomText={(enabled: boolean) => {
          setSettings({
            ...settings, resultSettings: {...settings.resultSettings, customTextEnabled: enabled,}
          })
        }}
      />
      <div className="filter-card-grid">
        <FilterCard title="Prefix modifiers" headerControl={
          <div className="radio-button-modgroup radio-button-modgroup-sm">
            <input type="radio" id="relic-match-any" name="matchType"
                   checked={settings.matchType === "any"}
                   onChange={() => {
                     setSettings({...settings, matchType: "any"})
                   }}/>
            <label htmlFor="relic-match-any" className="radio-first-ele">Match <b>any</b></label>
            <input type="radio" id="relic-match-both" name="matchType"
                   checked={settings.matchType === "both"}
                   onChange={() => {
                     setSettings({...settings, matchType: "both"})
                   }}/>
            <label htmlFor="relic-match-both">Match <b>both</b></label>
          </div>
        }>
          <SelectList
            id="prefix-modifiers"
            options={prefixes}
            selected={settings.modifier.prefixes}
            setSelected={(modifiers) => {
              setSettings({
                ...settings,
                modifier: {...settings.modifier, prefixes: modifiers}
              })
            }}
          />
        </FilterCard>
        <FilterCard title="Suffix modifiers">
          <SelectList
            id="suffix-modifiers"
            options={suffixes}
            selected={settings.modifier.suffixes}
            setSelected={(modifiers) => {
              setSettings({
                ...settings,
                modifier: {...settings.modifier, suffixes: modifiers}
              })
            }}
          />
        </FilterCard>
      </div>
    </>
  );
}
