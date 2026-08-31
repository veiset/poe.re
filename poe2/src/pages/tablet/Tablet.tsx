import React, {useContext, useEffect, useState} from "react";
import {loadSettings, saveSettings, setSelectedProfile} from "../../localStorage";
import {Poe2ProfileContext} from "../../layout/Poe2ProfileContext";
import {defaultSettings, SelectOption, Settings} from "../../settings";
import {generateTabletRegex} from "./TabletResult";
import {openTabletTradeSearch} from "../../utils/TradeUrlBuilder";
import {loadTabletAffixes, loadTabletTradeStatIds, TabletAffix, TradeStatIdMap} from "../../utils/loadData";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {SelectList} from "@poe2/components/SelectList";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import Poe2Header from "@poe2/components/Poe2Header";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import NumberField from "@shared/components/NumberField/NumberField";
import ModSearchBox from "@shared/components/ModSearchBox";
import AsyncTradePriceRange from "@shared/components/AsyncTradePriceRange/AsyncTradePriceRange";
import {useFavoritePage} from "@poe2/useFavoritePage";

export function Tablet() {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const globalSettings = loadSettings(currentProfile)
  const favoritePage = useFavoritePage("tablet", globalSettings.tablet);
  const [settings, setSettings] = useState<Settings["tablet"]>(favoritePage.initialConfiguration);
  const [result, setResult] = useState("");
  const [affixes, setAffixes] = useState<TabletAffix[]>([]);
  const [affixSearch, setAffixSearch] = useState("");
  const [tradeStatIds, setTradeStatIds] = useState<TradeStatIdMap>({});

  useEffect(() => {
    if (favoritePage.isEditingFavorite) { setResult(generateTabletRegex({...loadSettings(currentProfile), tablet: settings})); return; }
    loadTabletAffixes().then(setAffixes);
    loadTabletTradeStatIds().then(setTradeStatIds);
  }, []);

  const normalizedSearch = affixSearch.trim().toLowerCase();
  const affixOptions: SelectOption[] = affixes
    .filter((mod) => normalizedSearch === "" || mod.name.toLowerCase().includes(normalizedSearch))
    .map((mod) => ({
      id: mod.id,
      name: mod.name,
      isSelected: settings.modifier.affixes
        .some((e) => e.name === mod.name && e.isSelected),
      value: settings.modifier.affixes
        .find((e) => e.name === mod.name)?.value || null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  useEffect(() => {
    const base = loadSettings(currentProfile);
    const settingsResult = {...base, tablet: {...settings}, name: currentProfile};
    saveSettings(settingsResult);
    setResult(generateTabletRegex(settingsResult));
  }, [settings, favoritePage.isEditingFavorite]);

  useEffect(() => {
    if (favoritePage.isEditingFavorite) return;
    const gs = loadSettings(currentProfile);
    setSettings(gs.tablet);
    setResult(generateTabletRegex(gs));
    setSelectedProfile(currentProfile);
  }, [currentProfile, favoritePage.isEditingFavorite]);

  return (
    <>
      <Poe2Header text="Tablet"/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings)}
        reset={() => setSettings(defaultSettings.tablet)}
        onTradeSearch={() => openTabletTradeSearch({...loadSettings(currentProfile), tablet: settings}, tradeStatIds).catch(() => {})}
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
        middleAction={
          <AsyncTradePriceRange
            value={settings.asyncPriceRange}
            onChange={(asyncPriceRange) => setSettings({...settings, asyncPriceRange})}
            currencies={["exalted", "divine"] as const}
          />
        }
      />
      <div className="filter-card-grid">
        <FilterCard title="Tablet rarity">
          <Checkbox label="Rare" value={settings.rarity.rare}
                    onChange={(b) => setSettings({
                      ...settings, rarity: {...settings.rarity, rare: b}
                    })}
          />
          <Checkbox label="Magic" value={settings.rarity.magic}
                    onChange={(b) => setSettings({
                      ...settings, rarity: {...settings.rarity, magic: b}
                    })}
          />
          <Checkbox label="Normal" value={settings.rarity.normal}
                    onChange={(b) => setSettings({
                      ...settings, rarity: {...settings.rarity, normal: b}
                    })}
          />
        </FilterCard>
        <FilterCard title="Tablet type">
          <Checkbox label="Irradiated" value={settings.type.irradiated}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, irradiated: b}
                    })}
          />
          <Checkbox label="Ritual" value={settings.type.ritual}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, ritual: b}
                    })}
          />
          <Checkbox label="Delirium" value={settings.type.delirium}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, delirium: b}
                    })}
          />
          <Checkbox label="Breach" value={settings.type.breach}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, breach: b}
                    })}
          />
          <Checkbox label="Abyss" value={settings.type.abyss}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, abyss: b}
                    })}
          />
          <Checkbox label="Temple" value={settings.type.temple}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, temple: b}
                    })}
          />
          <Checkbox label="Overseer" value={settings.type.overseer}
                    onChange={(b) => setSettings({
                      ...settings, type: {...settings.type, overseer: b}
                    })}
          />
        </FilterCard>
        <FilterCard title="Modifier">
          <Checkbox label="Min. uses remaining" value={settings.modifier.usesRemaining}
                    onChange={(b) => setSettings({
                      ...settings, modifier: {...settings.modifier, usesRemaining: b}
                    })}
          />
          <NumberField id="tablet-uses-remaining" label="Min uses remaining"
                       value={String(settings.modifier.numUsesRemaining)}
                       onChange={(v) =>
                         setSettings({
                           ...settings, modifier: {...settings.modifier, numUsesRemaining: Math.min(Math.max(Number(v) || 0, 1), 18)}
                         })}
          />
          <p className="poe2-section-label poe2-section-label-spaced">Affix value matching</p>
          <Checkbox label="Round down to nearest 10 (saves a lot of space)" value={settings.modifier.round10}
                    onChange={(b) => setSettings({
                      ...settings, modifier: {...settings.modifier, round10: b}
                    })}
          />
        </FilterCard>
      </div>

      <div className="filter-card-grid">
        <FilterCard title="Modifiers to include" headerControl={
          <div className="radio-button-modgroup radio-button-modgroup-sm">
            <input type="radio" id="tablet-affix-any" name="affixSelectType"
                   checked={settings.modifier.affixSelectType === "any"}
                   onChange={() => {
                     setSettings({
                       ...settings, modifier: {...settings.modifier, affixSelectType: "any"}
                     })
                   }}/>
            <label htmlFor="tablet-affix-any" className="radio-first-ele">Match <b>any</b></label>
            <input type="radio" id="tablet-affix-all" name="affixSelectType"
                   checked={settings.modifier.affixSelectType === "all"}
                   onChange={() => {
                     setSettings({
                       ...settings, modifier: {...settings.modifier, affixSelectType: "all"}
                     })
                   }}/>
            <label htmlFor="tablet-affix-all">Match <b>all</b></label>
          </div>
        }>
          <ModSearchBox id="tablet-affix-search" search={affixSearch} setSearch={setAffixSearch}
                        placeholder="Filter modifiers..."/>
          <SelectList
            id="tablet-affix-modifiers"
            options={affixOptions}
            selected={settings.modifier.affixes}
            setSelected={(modifiers) => {
              setSettings({
                ...settings,
                modifier: {...settings.modifier, affixes: modifiers}
              })
            }}
          />
        </FilterCard>
      </div>
    </>
  )
}
