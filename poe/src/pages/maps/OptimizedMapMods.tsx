import React, {useContext, useEffect, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {HeaderWithLanguage} from "@poe/components/Header";
import SelectableTokenList from "@poe/components/SelectableTokenList/SelectableTokenList";
import {defaultSettings, MapSettings} from "@poe/utils/SavedSettings";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {generateMapModRegex} from "./OptimizedMapOutput";
import "./OptimizedMapMods.css";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import {TradeAsterisk} from "@shared/components/TradeAsterisk";
import {LanguageFiles} from "@poe/utils/Languages";
import {openTradeSearch, TradeSettings} from "@poe/core/TradeUrlBuilder";
import {MapModsTokenOption, Token} from "@poe/generated/mapmods/GeneratedTypes";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import IncludeExcludeToggle from "@poe/components/IncludeExcludeToggle/IncludeExcludeToggle";
import NumberField from "@shared/components/NumberField/NumberField";
import PillToggle from "@poe/components/PillToggle/PillToggle";
import ExactOptimizedToggle from "@poe/components/ExactOptimizedToggle/ExactOptimizedToggle";
import {mapModTokenColor} from "@poe/utils/MapModColor";
import {usePoe1League} from "@shared/core/LeagueContext";
import MatchAnyAllToggle from "@shared/components/MatchAnyAllToggle/MatchAnyAllToggle";
import AsyncTradePriceRange from "@shared/components/AsyncTradePriceRange/AsyncTradePriceRange";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";

const OptimizedMapMods = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("maps", storedProfile.map);
  const profile = {...storedProfile, map: favoritePage.initialConfiguration};
  const {league} = usePoe1League();
  const [result, setResult] = useState("");
  const [selectedBadIds, setSelectedBadIds] = useState<number[]>(profile.map.badIds);
  const [selectedGoodIds, setSelectedGoodIds] = useState<number[]>(profile.map.goodIds);
  const [modGrouping, setModGrouping] = useState(profile.map.allGoodMods);
  const [quantity, setQuantity] = useState(profile.map.quantity);
  const [packsize, setPacksize] = useState(profile.map.packsize);
  const [itemRarity, setItemRarity] = useState(profile.map.itemRarity);
  const [currency, setCurrency] = useState(profile.map.currency);
  const [scarab, setScarab] = useState(profile.map.scarab);
  const [divination, setDivination] = useState(profile.map.divination);
  const [optimizeQuant, setOptimizeQuant] = useState(profile.map.optimizeQuant);
  const [optimizePacksize, setOptimizePacksize] = useState(profile.map.optimizePacksize);
  const [optimizeQuality, setOptimizeQuality] = useState(profile.map.optimizeQuality);
  const [anyQuality, setAnyQuality] = useState(profile.map.anyQuality);
  const [anyYield, setAnyYield] = useState(profile.map.anyYield);
  const [rarity, setRarity] = useState(profile.map.rarity);
  const [corrupted, setCorrupted] = useState(profile.map.corrupted);
  const [unidentified, setUnidentified] = useState(profile.map.unidentified);
  const [quality, setQuality] = useState(profile.map.quality);
  const [regex, setRegex] = useState(LanguageFiles.mapmods[profile.language]);
  const [mapDropChance, setMapDropChance] = useState(profile.map.mapDropChance);
  const [displayNightmareMods, setDisplayNightmareMods] = useState(profile.map.displayNightmareMods);
  const [displayAffixBadges, setDisplayAffixBadges] = useState(profile.map.displayAffixBadges);
  const [groupByAffix, setGroupByAffix] = useState(profile.map.groupByAffix);
  const [tradeEightModOnly, setTradeEightModOnly] = useState(profile.map.tradeEightModOnly);
  const [tradeExcludeValdo, setTradeExcludeValdo] = useState(profile.map.tradeExcludeValdo);
  const [tradeExcludeShaperElder, setTradeExcludeShaperElder] = useState(profile.map.tradeExcludeShaperElder);
  const [asyncPriceRange, setAsyncPriceRange] = useState(profile.map.asyncPriceRange);
  const eightModDisabled = corrupted.enabled && !corrupted.include;

  const [customTextStr, setCustomTextStr] = useState(profile.map.customText.value);
  const [enableCustomText, setEnableCustomText] = useState(profile.map.customText.enabled);
  const [tradeSearchLoading, setTradeSearchLoading] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);
  const settings: MapSettings = {
    badIds: selectedBadIds, goodIds: selectedGoodIds, allGoodMods: modGrouping,
    quantity, packsize, itemRarity, currency, scarab, divination, optimizeQuant, optimizePacksize, optimizeQuality,
    rarity, corrupted, unidentified, quality, anyQuality, anyYield, displayNightmareMods, displayAffixBadges,
    groupByAffix, tradeEightModOnly, tradeExcludeValdo, tradeExcludeShaperElder, asyncPriceRange,
    customText: {value: customTextStr, enabled: enableCustomText}, mapDropChance,
  };

  const handleTradeSearch = async () => {
    if (!league) {
      setTradeMessage("League data is still loading. Please try again shortly.");
      return;
    }
    setTradeSearchLoading(true);
    setTradeMessage(null);
    try {
      const settings: TradeSettings = {
        badIds: selectedBadIds,
        goodIds: selectedGoodIds,
        allGoodMods: modGrouping,
        quantity,
        packsize,
        itemRarity,
        currency,
        scarab,
        divination,
        regex: result,
        eightModOnly: tradeEightModOnly && !eightModDisabled,
        excludeValdo: tradeExcludeValdo,
        excludeShaperElder: tradeExcludeShaperElder,
        mapDropChance,
        quality,
        anyQuality,
        anyYield,
        asyncPriceRange,
        corrupted,
        unidentified,
      };
      const tradeResult = await openTradeSearch(settings, league);
      if (tradeResult.success) {
        setTradeMessage("Trade search opened!");
      } else {
        setTradeMessage(`Trade site opened. ${tradeResult.error ? `(${tradeResult.error})` : ''}`);
      }
      setTimeout(() => setTradeMessage(null), 5000);
    } finally {
      setTradeSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, map: {...settings}}));
    setResult(generateMapModRegex(settings, regex, profile.language));
  }, [result, rarity, corrupted, unidentified, quality, anyQuality, anyYield, itemRarity, currency, scarab, divination, selectedBadIds, selectedGoodIds, modGrouping, quantity, packsize, optimizeQuant, optimizePacksize, optimizeQuality, customTextStr, enableCustomText, regex, mapDropChance, displayNightmareMods, displayAffixBadges, groupByAffix, tradeEightModOnly, tradeExcludeValdo, tradeExcludeShaperElder, asyncPriceRange]);

  const renderAffixTag = displayAffixBadges
    ? (token: Token<MapModsTokenOption>) => (
        <span className={`mod-affix-tag mod-affix-tag--${token.options.prefix ? "prefix" : "suffix"}`}>
          {token.options.prefix ? "P" : "S"}
        </span>
      )
    : undefined;

  const affixGroupFn = groupByAffix
    ? (token: Token<MapModsTokenOption>) =>
        token.options.prefix
          ? {key: "prefix", label: "Prefix"}
          : {key: "suffix", label: "Suffix"}
    : undefined;

  const visibleTokens = regex.tokens.filter((e) => displayNightmareMods ? true : !e.options.nm);

  return (
    <>
      <HeaderWithLanguage text={"Optimized Map Modifiers"}/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings, {language: storedProfile.language, league})}
        warning={undefined}
        enableBug={true}
        customText={customTextStr}
        setCustomText={setCustomTextStr}
        enableCustomText={enableCustomText}
        setEnableCustomText={setEnableCustomText}
        onTradeSearch={handleTradeSearch}
        tradeSearchLoading={tradeSearchLoading}
        middleAction={
          <AsyncTradePriceRange value={asyncPriceRange} onChange={setAsyncPriceRange}/>
        }
        reset={() => {
          setSelectedBadIds(defaultSettings.map.badIds);
          setSelectedGoodIds(defaultSettings.map.goodIds);
          setOptimizePacksize(defaultSettings.map.optimizePacksize);
          setOptimizeQuant(defaultSettings.map.optimizeQuant);
          setOptimizeQuality(defaultSettings.map.optimizeQuality);
          setModGrouping(defaultSettings.map.allGoodMods)
          setQuantity(defaultSettings.map.quantity);
          setPacksize(defaultSettings.map.packsize);
          setItemRarity(defaultSettings.map.itemRarity);
          setCurrency(defaultSettings.map.currency);
          setScarab(defaultSettings.map.scarab);
          setDivination(defaultSettings.map.divination);
          setAnyYield(defaultSettings.map.anyYield);
          setRarity(defaultSettings.map.rarity);
          setCorrupted(defaultSettings.map.corrupted);
          setUnidentified(defaultSettings.map.unidentified);
          setQuality(defaultSettings.map.quality);
          setEnableCustomText(defaultSettings.map.customText.enabled);
          setCustomTextStr(defaultSettings.map.customText.value);
          setMapDropChance(defaultSettings.map.mapDropChance);
          setDisplayNightmareMods(defaultSettings.map.displayNightmareMods);
          setDisplayAffixBadges(defaultSettings.map.displayAffixBadges);
          setGroupByAffix(defaultSettings.map.groupByAffix);
          setTradeEightModOnly(defaultSettings.map.tradeEightModOnly);
          setTradeExcludeValdo(defaultSettings.map.tradeExcludeValdo);
          setTradeExcludeShaperElder(defaultSettings.map.tradeExcludeShaperElder);
          setAsyncPriceRange(defaultSettings.map.asyncPriceRange);
        }}
      />
      {tradeMessage && (
        <div className="trade-message">
          {tradeMessage}
        </div>
      )}
      <div className="break"/>
      <p className="trade-info-text">* Fields marked with an asterisk are compatible with the Trade search.</p>

      <div className="filter-card-grid">
        <FilterCard title="Quantity & Yield"
                    headerControl={
                      <ExactOptimizedToggle name="yield-mode"
                                            optimized={optimizeQuant && optimizePacksize}
                                            setOptimized={(v) => {
                                              setOptimizeQuant(v);
                                              setOptimizePacksize(v);
                                            }}/>
                    }>
          <div className="mm-field-grid">
            <NumberField id="quantity" label="Quantity" value={quantity} onChange={setQuantity} trade/>
            <NumberField id="pack-size" label="Pack Size" value={packsize} onChange={setPacksize} trade/>
            <NumberField id="mapdrop" label="More maps" value={mapDropChance} onChange={setMapDropChance} trade/>
            <NumberField id="itemRarity" label="Item rarity" value={itemRarity} onChange={setItemRarity} trade/>
            <NumberField id="currency" label="More currency" value={currency} onChange={setCurrency} trade/>
            <NumberField id="scarab" label="More scarab" value={scarab} onChange={setScarab} trade/>
            <NumberField id="divination" label="More divination" value={divination} onChange={setDivination} trade/>
          </div>
          <Checkbox label="Match any of the yield types (disable to match ALL selected yields)"
                    value={anyYield}
                    onChange={setAnyYield}/>
        </FilterCard>
        
        <FilterCard title="Map State">
          <div className={`mm-state-row${corrupted.enabled ? "" : " mm-state-row-off"}`}>
            <Checkbox label={<>Filter corrupted<TradeAsterisk/></>} value={corrupted.enabled}
                      onChange={() => setCorrupted({...corrupted, enabled: !corrupted.enabled})}/>
            <IncludeExcludeToggle name="corrupted" include={corrupted.include}
                                  setInclude={(v) => setCorrupted({...corrupted, include: v})}/>
          </div>
          <div className={`mm-state-row`}>
            <Checkbox label="Normal Maps" value={rarity.normal}
                      onChange={(e) => setRarity({...rarity, normal: !!e})}/>
            <Checkbox label="Magic Maps" value={rarity.magic}
                      onChange={(e) => setRarity({...rarity, magic: !!e})}/>
            <Checkbox label="Rare Maps" value={rarity.rare}
                      onChange={(e) => setRarity({...rarity, rare: !!e})}/>
            <IncludeExcludeToggle name="map-rarity" include={rarity.include}
                                  setInclude={(v) => setRarity({...rarity, include: v})}/>
          </div>
          <div className={`mm-state-row${unidentified.enabled ? "" : " mm-state-row-off"}`}>
            <Checkbox label={<>Filter unidentified<TradeAsterisk/></>} value={unidentified.enabled}
                      onChange={() => setUnidentified({...unidentified, enabled: !unidentified.enabled})}/>
            <IncludeExcludeToggle name="unidentified" include={unidentified.include}
                                  setInclude={(v) => setUnidentified({...unidentified, include: v})}/>
          </div>
        </FilterCard>

        <FilterCard title="Quality"
                    headerControl={
                      <ExactOptimizedToggle name="quality-mode"
                                            optimized={optimizeQuality}
                                            setOptimized={setOptimizeQuality}/>
                    }>
          <div className="mm-field-grid">
            <NumberField id="qregular" label="Quality of" value={quality.regular} primary
                         onChange={(v) => setQuality({...quality, regular: v})}/>
            <NumberField id="qpacksize" label="• Pack size" value={quality.packSize}
                         onChange={(v) => setQuality({...quality, packSize: v})} trade/>
            <NumberField id="qrarity" label="• Rarity" value={quality.rarity}
                         onChange={(v) => setQuality({...quality, rarity: v})} trade/>
            <NumberField id="qcurrency" label="• Currency" value={quality.currency}
                         onChange={(v) => setQuality({...quality, currency: v})} trade/>
            <NumberField id="qdiv" label="• Divination" value={quality.divination}
                         onChange={(v) => setQuality({...quality, divination: v})} trade/>
            <NumberField id="qscarab" label="• Scarab" value={quality.scarab}
                         onChange={(v) => setQuality({...quality, scarab: v})} trade/>
          </div>
          <Checkbox label="Match any of the quality types (disable to match ALL selected qualities)"
                    value={anyQuality}
                    onChange={setAnyQuality}/>
        </FilterCard>

        <FilterCard title="Trade Search">
          <Checkbox label={<>Only 8-mod maps<TradeAsterisk/></>}
                    value={tradeEightModOnly}
                    onChange={setTradeEightModOnly}
                    disabled={eightModDisabled}/>
          <Checkbox label={<>Exclude Valdo maps<TradeAsterisk/></>}
                    value={tradeExcludeValdo}
                    onChange={setTradeExcludeValdo}/>
          <Checkbox label={<>Exclude Shaper/Elder influenced maps<TradeAsterisk/></>}
                    value={tradeExcludeShaperElder}
                    onChange={setTradeExcludeShaperElder}/>
        </FilterCard>

      </div>

      <div className="mm-mod-picker">
        <div className="mm-mod-column">
          <div className="mm-mod-column-header">
            <span className="mm-mod-column-title mm-mod-column-title-bad">I don't want any of these mods</span>
            <div className="mm-display-pills">
              <PillToggle variant="nightmare" label="Nightmare"
                          active={displayNightmareMods}
                          onToggle={() => setDisplayNightmareMods(!displayNightmareMods)}/>
              <PillToggle variant="affix" label="P/S badges"
                          active={displayAffixBadges}
                          onToggle={() => setDisplayAffixBadges(!displayAffixBadges)}/>
              <PillToggle variant="group" label="Group by affix"
                          active={groupByAffix}
                          onToggle={() => setGroupByAffix(!groupByAffix)}/>
            </div>
          </div>
          <SelectableTokenList
            sortFn={(a, b) => b.options.scary - a.options.scary}
            colorFun={mapModTokenColor}
            elements={visibleTokens}
            setSelected={setSelectedBadIds}
            selected={selectedBadIds}
            tagFn={renderAffixTag}
            groupFn={affixGroupFn}
            groupOrder={["prefix", "suffix"]}
          />
        </div>
        <div className="mm-mod-column">
          <div className="mm-mod-column-header">
            <span className="mm-mod-column-title mm-mod-column-title-good">I want these mods</span>
            <MatchAnyAllToggle
              id="map-mods"
              value={modGrouping ? "all" : "any"}
              onChange={(value) => setModGrouping(value === "all")}
            />
          </div>
          <SelectableTokenList
            sortFn={(a, b) => a.options.scary - b.options.scary}
            colorFun={mapModTokenColor}
            elements={visibleTokens}
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


export default OptimizedMapMods;
