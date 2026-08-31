import React, {useContext, useEffect, useState} from "react";
import {loadSettings, saveSettings, setSelectedProfile} from "../../localStorage";
import {Poe2ProfileContext} from "../../layout/Poe2ProfileContext";
import {defaultSettings, SelectOption, Settings} from "../../settings";
import {generateWaystoneRegex} from "./WaystoneResult";
import {openWaystoneTradeSearch} from "../../utils/TradeUrlBuilder";
import {loadWaystoneAffixes, loadWaystoneTradeStatIds, TradeStatIdMap, WaystoneAffix} from "../../utils/loadData";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {SelectList} from "@poe2/components/SelectList";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import Poe2Header from "@poe2/components/Poe2Header";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import NumberField from "@shared/components/NumberField/NumberField";
import MatchAnyAllToggle from "@shared/components/MatchAnyAllToggle/MatchAnyAllToggle";
import AsyncTradePriceRange from "@shared/components/AsyncTradePriceRange/AsyncTradePriceRange";
import {useFavoritePage} from "@poe2/useFavoritePage";

export function Waystone() {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const globalSettings = loadSettings(currentProfile)
  const favoritePage = useFavoritePage("waystone", globalSettings.waystone);
  const [settings, setSettings] = useState<Settings["waystone"]>(favoritePage.initialConfiguration);
  const [result, setResult] = useState("");
  const [affixes, setAffixes] = useState<WaystoneAffix[]>([]);
  const [tradeStatIds, setTradeStatIds] = useState<TradeStatIdMap>({});

  useEffect(() => {
    if (favoritePage.isEditingFavorite) { setResult(generateWaystoneRegex({...loadSettings(currentProfile), waystone: settings})); return; }
    loadWaystoneAffixes().then(setAffixes);
    loadWaystoneTradeStatIds().then(setTradeStatIds);
  }, []);

  const wantedMods: SelectOption[] = affixes
    .map((mod) => ({
      id: mod.id,
      name: mod.name,
      isSelected: settings.modifier.wantedMods
        .some((e) => e.name === mod.name && e.isSelected),
      value: settings.modifier.wantedMods
        .find((e) => e.name === mod.name)?.value || null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  const unwantedMods: SelectOption[] = affixes
    .map((mod) => ({
      id: mod.id,
      name: mod.name,
      isSelected: settings.modifier.unwantedMods
        .some((e) => e.name === mod.name && e.isSelected),
      value: settings.modifier.unwantedMods
        .find((e) => e.name === mod.name)?.value || null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  useEffect(() => {
    const base = loadSettings(currentProfile);
    const settingsResult = {...base, waystone: {...settings}, name: currentProfile};
    saveSettings(settingsResult);
    setResult(generateWaystoneRegex(settingsResult));
  }, [settings, favoritePage.isEditingFavorite]);

  useEffect(() => {
    if (favoritePage.isEditingFavorite) return;
    const gs = loadSettings(currentProfile);
    setSettings(gs.waystone);
    setResult(generateWaystoneRegex(gs));
    setSelectedProfile(currentProfile);
  }, [currentProfile, favoritePage.isEditingFavorite]);

  const quantifierField = (id: string, label: string, value: string, key: "itemRarity" | "waystoneDropChance" | "monsterEffectiveness" | "monsterRarity" | "packSize") => (
    <NumberField id={id} label={label} value={value}
                 onChange={(v) => setSettings({
                   ...settings,
                   [key]: v === "" ? "" : String(Math.max(0, Number(v)))
                 })}
    />
  );

  return (
    <>
      <Poe2Header text="Waystone"/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings)}
        reset={() => setSettings(defaultSettings.waystone)}
        onTradeSearch={() => openWaystoneTradeSearch({...loadSettings(currentProfile), waystone: settings}, tradeStatIds).catch(() => {})}
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
        <FilterCard title="Quantity & yield">
          {quantifierField("waystone-iir", "Item rarity (IIR)", settings.itemRarity, "itemRarity")}
          {quantifierField("waystone-pack-size", "Pack size", settings.packSize, "packSize")}
          {quantifierField("waystone-monster-rarity", "Monster rarity", settings.monsterRarity, "monsterRarity")}
          {quantifierField("waystone-monster-effectiveness", "Monster effectiveness", settings.monsterEffectiveness, "monsterEffectiveness")}
          {quantifierField("waystone-drop-chance", "Waystone drop chance", settings.waystoneDropChance, "waystoneDropChance")}
        </FilterCard>

        <FilterCard title="Tier & revives">
          <NumberField id="waystone-min-tier" label="Minimum tier"
                       value={settings.tier.min === 0 ? "" : String(settings.tier.min)}
                       onChange={(v) => {
                         setSettings({
                           ...settings, tier: {...settings.tier, min: Math.min(Number(v), 16)}
                         })
                       }}
          />
          <NumberField id="waystone-max-tier" label="Maximum tier"
                       value={settings.tier.max === 0 ? "" : String(settings.tier.max)}
                       onChange={(v) => {
                         setSettings({
                           ...settings, tier: {...settings.tier, max: Math.min(Number(v), 16)}
                         })
                       }}
          />
          <NumberField id="waystone-min-revives" label="Minimum revives"
                       value={String(settings.revives.min)}
                       onChange={(v) => {
                         setSettings({
                           ...settings, revives: {...settings.revives, min: v === "" ? 0 : Math.min(Number(v), 6)}
                         })
                       }}
          />
          <NumberField id="waystone-max-revives" label="Maximum revives"
                       value={String(settings.revives.max)}
                       onChange={(v) => {
                         setSettings({
                           ...settings, revives: {...settings.revives, max: v === "" ? 0 : Math.min(Number(v), 6)}
                         })
                       }}
          />
          <div className="warning-soft">
            Setting min and max revives to 0 will find 6+ modifier waystones.
            There is currently <b>no</b> way to search for <b>8 mods</b>.
          </div>
        </FilterCard>

        <FilterCard title="Rarity & state">
          <p className="poe2-section-label">Waystone rarity</p>
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
          <p className="poe2-section-label poe2-section-label-spaced">State</p>
          <Checkbox label="Corrupted waystones" value={settings.state.corrupted}
                    onChange={(b) => setSettings({
                      ...settings, state: {...settings.state, corrupted: b}
                    })}
          />
          <Checkbox label="Uncorrupted waystones" value={settings.state.uncorrupted}
                    onChange={(b) => setSettings({
                      ...settings, state: {...settings.state, uncorrupted: b}
                    })}
          />
          <Checkbox label="Players in area are #% delirious" value={settings.state.delirious}
                    onChange={(b) => setSettings({
                      ...settings, state: {...settings.state, delirious: b}
                    })}
          />
          <p className="poe2-section-label poe2-section-label-spaced">Global settings</p>
          <Checkbox label="Round down to nearest 10 (saves a lot of space)" value={settings.modifier.round10}
                    onChange={(b) => setSettings({
                      ...settings, modifier: {...settings.modifier, round10: b}
                    })}
          />
        </FilterCard>
      </div>

      <div className="filter-card-grid">
        <FilterCard title="I don't want any of these mods">
          <SelectList
            id="unwanted-mods"
            options={unwantedMods}
            selected={settings.modifier.unwantedMods}
            setSelected={(modifiers) => {
              setSettings({
                ...settings,
                modifier: {...settings.modifier, unwantedMods: modifiers}
              })
            }}
          />
        </FilterCard>
        <FilterCard title="I want these mods" headerControl={
          <MatchAnyAllToggle
            id="waystone-mods"
            value={settings.modifier.wantedModsSelectType}
            onChange={(wantedModsSelectType) => setSettings({
              ...settings, modifier: {...settings.modifier, wantedModsSelectType}
            })}
          />
        }>
          <SelectList
            id="wanted-mods"
            options={wantedMods}
            selected={settings.modifier.wantedMods}
            setSelected={(modifiers) => {
              setSettings({
                ...settings,
                modifier: {...settings.modifier, wantedMods: modifiers}
              })
            }}
          />
        </FilterCard>
      </div>
    </>
  )
}
