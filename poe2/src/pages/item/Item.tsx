import React, {useContext, useEffect, useMemo, useState} from "react";
import {loadSettings, saveSettings, setSelectedProfile} from "../../localStorage";
import {Poe2ProfileContext} from "../../layout/Poe2ProfileContext";
import {defaultSettings, ItemSettings} from "../../settings";
import {loadItemBasetypes, loadItemRegex} from "../../utils/loadData";
import {ItemBaseSelector} from "./ItemBaseSelector";
import {RareModifierSelect} from "./RareModifierSelect";
import {Itembase, ItemRegex} from "../../types/generated/ItemTypedef";
import {ItemBasetype} from "../../types/generated/ItemBasetypesTypedef";
import {generateRareItemRegex} from "./ItemResult";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import Poe2Header from "@poe2/components/Poe2Header";
import {useFavoritePage} from "@poe2/useFavoritePage";

export function Item() {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const globalSettings = loadSettings(currentProfile);
  const favoritePage = useFavoritePage("item", globalSettings.item);
  const [settings, setSettings] = useState<ItemSettings>(favoritePage.initialConfiguration);
  const [result, setResult] = useState("");

  const [basetypes, setBasetypes] = useState<ItemBasetype[]>([]);
  const [allItemRegex, setAllItemRegex] = useState<ItemRegex[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (favoritePage.isEditingFavorite) { setResult(generateRareItemRegex(settings)); return; }
    loadItemBasetypes().then(setBasetypes);
    loadItemRegex().then(setAllItemRegex);
  }, []);

  const searchItems = useMemo(() => {
    return basetypes.flatMap((base) =>
      base.item.map((item) => ({baseType: base.base, item}))
    );
  }, [basetypes]);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q === "") return [];
    return searchItems.filter(
      (e) =>
        e.item.toLowerCase().includes(q) ||
        e.baseType.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchText, searchItems]);

  const currentItemRegex = useMemo(() => {
    if (!settings.itemBase) return undefined;
    return allItemRegex.find((e) => e.basetype === settings.itemBase!.baseType);
  }, [settings.itemBase, allItemRegex]);

  // Save settings and generate result
  useEffect(() => {
    const base = loadSettings(currentProfile);
    const settingsResult = {...base, item: {...settings}, name: currentProfile};
    saveSettings(settingsResult);
    setResult(generateRareItemRegex(settings));
  }, [settings, favoritePage.isEditingFavorite]);

  useEffect(() => {
    if (favoritePage.isEditingFavorite) return;
    const gs = loadSettings(currentProfile);
    setSettings(gs.item);
    setSelectedProfile(currentProfile);
  }, [currentProfile, favoritePage.isEditingFavorite]);

  const setItemBase = (itemBase: Itembase) => {
    setSettings({...settings, itemBase});
    setSearchText("");
  };

  return (
    <>
      <Poe2Header text="Item"/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings)}
        reset={() => setSettings(defaultSettings.item)}
        customText={settings.resultSettings.customText}
        enableCustomText={settings.resultSettings.customTextEnabled}
        autoCopy={settings.resultSettings.autoCopy}
        setCustomText={(text) => {
          setSettings({
            ...settings,
            resultSettings: {...settings.resultSettings, customText: text}
          })
        }}
        onAutoCopyChange={(enable: boolean) => {
          setSettings({
            ...settings,
            resultSettings: {...settings.resultSettings, autoCopy: enable}
          })
        }}
        setEnableCustomText={(enabled: boolean) => {
          setSettings({
            ...settings,
            resultSettings: {...settings.resultSettings, customTextEnabled: enabled}
          })
        }}
      />
      <div className="break"/>
      <div className="warning-banner">
        <b>Beta feature!</b><br/>
        Regex might incorrectly match modifiers. <br/>
        Please report bugs for incorrect matches and I'll try to fix them. Keep in mind that generating unique regex for generic item modifiers is really hard!
      </div>

      <div className="filter-card-grid">
        <ItemBaseSelector
          searchText={searchText}
          setSearchText={setSearchText}
          filteredItems={filteredItems}
          setItemBase={setItemBase}
          settings={settings}
          setSettings={setSettings}
          currentItemRegex={currentItemRegex}
        />
      </div>

      {settings.itemBase && currentItemRegex && (
        <RareModifierSelect
          itemRegex={currentItemRegex}
          itemBase={settings.itemBase}
          selected={settings.selectedMods}
          setSelected={(mods) => setSettings({...settings, selectedMods: mods})}
        />
      )}
    </>
  );
}
