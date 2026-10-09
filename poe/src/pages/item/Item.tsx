import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {HeaderWithLanguage} from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import ItemBaseSelector, {Itembase} from "@shared/core/item/ItemBaseSelector";
import RareItemSelect, {RareModSelection} from "@shared/core/item/RareItemSelect";
import ModWarning from "@shared/core/item/ModWarning";
import {generateMagicItemRegex, generateRareItemRegex} from "@shared/core/item/ItemOutput";
import MagicItemSelect, {SelectedMagicMod} from "@shared/core/item/MagicItemSelect";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";
import ItemInfoBanner from "@shared/components/item/ItemInfoBanner";
import SimilarItemsInfo from "@shared/components/item/SimilarItemsInfo";
import RareItemMatchSettings from "@shared/components/item/RareItemMatchSettings";
import MagicItemMatchSettings from "@shared/components/item/MagicItemMatchSettings";
import type {BaseType, ItemAffixRegex, ItemRegex} from "@shared/generated/item";
import {itemSettingsLanguage, loadItemBasetypes, loadItemRegex} from "@poe/utils/loadData";
import {findSimilarBases, groupAffixes} from "@shared/core/item/GroupUtils";
import {rebaseItemSettings} from "@shared/core/item/RebaseItemSettings";
import {Spinner} from "@shared/components/Spinner/Spinner";
import {RepoeLanguage} from "@poe/utils/Languages";
import {ItemCraftingSettings} from "@shared/types/Settings.types";
import "./Item.css";

const Item = () => {
  const {globalProfile, lang} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("items", storedProfile.itemCrafting);
  const profile = {...storedProfile, itemCrafting: favoritePage.initialConfiguration};
  const [result, setResult] = useState<string>("");
  const [basetypes, setBasetypes] = useState<BaseType[]>([]);
  const [itemRegex, setItemRegex] = useState<ItemRegex[]>([]);
  const [dataLanguage, setDataLanguage] = useState<string>();
  const [regexLanguage, setRegexLanguage] = useState<string>();
  const loadedLanguage = useRef<string | undefined>(undefined);

  const affixMap: Record<string, ItemAffixRegex> = useMemo(() => groupAffixes(itemRegex), [itemRegex]);

  const [itembase, setItembase] = useState<Itembase | undefined>(profile.itemCrafting.itembase);
  const [matchSimilarBases, setMatchSimilarBases] = useState(profile.itemCrafting.matchSimilarBases);
  const [regexMods, setRegexMods] = useState<ItemRegex | undefined>(undefined);
  const [selectedRareMods, setSelectedRareMods] = useState<{
    [key: string]: RareModSelection
  }>(profile.itemCrafting.selectedRareMods);
  const [selectedMagicMods, setSelectedMagicMods] = useState<SelectedMagicMod[]>(profile.itemCrafting.selectedMagicMods);
  const [matchAnyMod, setMatchAnyMod] = useState(profile.itemCrafting.rareSettings.matchAnyMod);
  const [matchPrefixAndSuffix, setMatchPrefixAndSuffix] = useState(profile.itemCrafting.rareSettings.matchPrefixAndSuffix);
  const [onlyIfBothPrefixAndSuffix, setOnlyIfBothPrefixAndSuffix] = useState(profile.itemCrafting.magicSettings.onlyIfBothPrefixAndSuffix);
  const [matchOpenAffix, setMatchOpenAffix] = useState(profile.itemCrafting.magicSettings.matchOpenAffix);

  const [customTextStr, setCustomTextStr] = useState(profile.itemCrafting.customText.value);
  const [enableCustomText, setEnableCustomText] = useState(profile.itemCrafting.customText.enabled);

  const [nonMagicalBase, setNonMagicalBase] = useState(false);
  const [onlyMagicBase, setOnlyMagicBase] = useState(false);
  const nonMagicBases = ["heist"];
  const onlyMagicBases = ["utility flasks"];

  const loading = dataLanguage !== lang || (itembase !== undefined && regexLanguage !== lang);

  const similarItems = matchSimilarBases && itembase ?
    findSimilarBases(itembase.baseType, itembase.item, basetypes) : [];
  const magicNameCategories = regexMods && {
    ...regexMods,
    categoryRegex: regexMods.categoryRegex.filter(({category}) => category === "prefix" || category === "suffix"),
  };
  const magicModifierCategories = regexMods && {
    ...regexMods,
    categoryRegex: regexMods.categoryRegex.filter(({category}) => category !== "prefix" && category !== "suffix"),
  };

  const currentSettings: ItemCraftingSettings = {
    itembase, matchSimilarBases, selectedRareMods, selectedMagicMods,
    rareSettings: {matchAnyMod, matchPrefixAndSuffix},
    magicSettings: {onlyIfBothPrefixAndSuffix, matchOpenAffix},
    customText: {value: customTextStr, enabled: enableCustomText},
  };
  const currentSettingsRef = useRef(currentSettings);
  currentSettingsRef.current = currentSettings;

  useEffect(() => {
    let active = true;
    setResult("");
    setDataLanguage(undefined);
    setItemRegex([]);
    setRegexLanguage(undefined);
    (async () => {
      const current = currentSettingsRef.current;
      const sourceLanguage = loadedLanguage.current
        ?? await itemSettingsLanguage(favoritePage.initialLanguage, current.itembase);
      const rebase = sourceLanguage !== lang;
      // The mod data is large, so it is only loaded here when selected mods have to move language
      const moveMods = rebase && (Object.keys(current.selectedRareMods).length > 0 || current.selectedMagicMods.length > 0);
      const noRegex: Promise<ItemRegex[] | undefined> = Promise.resolve(undefined);
      const [sourceBases, nextBases, sourceRegex, nextRegex] = await Promise.all([
        loadItemBasetypes(sourceLanguage), loadItemBasetypes(lang),
        moveMods ? loadItemRegex(sourceLanguage) : noRegex, moveMods ? loadItemRegex(lang) : noRegex,
      ]);
      if (!active) return;
      if (rebase) {
        const rebased = rebaseItemSettings(current, sourceBases, nextBases, sourceRegex ?? [], nextRegex ?? []).settings;
        setItembase(rebased.itembase);
        if (moveMods) {
          setSelectedRareMods(rebased.selectedRareMods);
          setSelectedMagicMods(rebased.selectedMagicMods);
        }
      }
      loadedLanguage.current = lang;
      setBasetypes(nextBases);
      if (nextRegex) {
        setItemRegex(nextRegex);
        setRegexLanguage(lang);
      }
      setDataLanguage(lang);
    })();
    return () => { active = false; };
  }, [lang, favoritePage.initialLanguage]);

  useEffect(() => {
    if (!itembase || dataLanguage !== lang || regexLanguage === lang) return;
    let active = true;
    loadItemRegex(lang).then((regex) => {
      if (!active) return;
      setItemRegex(regex);
      setRegexLanguage(lang);
    });
    return () => { active = false; };
  }, [itembase, dataLanguage, lang, regexLanguage]);

  useEffect(() => {
    if (itembase) {
      setRegexMods(itemRegex.find((entry) => entry.basetype === itembase.baseType));
      const nonMagicalType = nonMagicBases.some((e) => itembase?.baseType.toLowerCase().includes(e.toLowerCase()));
      setNonMagicalBase(nonMagicalType);
      if (nonMagicalType && itembase.rarity === "Magic") {
        setItembase({...itembase, rarity: "Rare"});
      }

      const onlyMagicType = onlyMagicBases.some((e) => itembase?.baseType.toLowerCase().includes(e.toLowerCase()));
      setOnlyMagicBase(onlyMagicType);
      if (onlyMagicType && itembase.rarity === "Rare") {
        setItembase({...itembase, rarity: "Magic"});
      }
    }
  }, [itembase, itemRegex]);

  useEffect(() => {
    if (dataLanguage !== lang) { setResult(""); return; }
    if (itembase && itembase.rarity === "Rare") {
      setResult(generateRareItemRegex(affixMap, currentSettings));
    }
    if (itembase && itembase.rarity === "Magic") {
      const selectedModifierMods = Object.fromEntries(Object.entries(selectedRareMods)
        .filter(([key]) => magicModifierCategories?.categoryRegex
          .some(({category}) => key.startsWith(`${itembase.baseType}-${category}-`))));
      setResult([
        generateMagicItemRegex(currentSettings, basetypes),
        generateRareItemRegex(affixMap, {...currentSettings, selectedRareMods: selectedModifierMods}),
      ].filter(Boolean).join(" "));
    }
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({
      ...latest,
      itemCrafting: currentSettings
    }));
  }, [selectedRareMods, selectedMagicMods, itembase, onlyIfBothPrefixAndSuffix, matchOpenAffix, matchAnyMod, matchPrefixAndSuffix, customTextStr, enableCustomText, matchSimilarBases, itemRegex, basetypes, dataLanguage, lang]);

  return (<>
      <HeaderWithLanguage text={"Item"}/>
      <RegexResultBox
        result={result}
        loading={loading}
        favorite={favoritePage.action(currentSettings, {language: lang})}
        reset={() => {
          setNonMagicalBase(false);
          setMatchSimilarBases(defaultSettings.itemCrafting.matchSimilarBases);
          if (itembase?.rarity === "Rare") {
            setMatchAnyMod(defaultSettings.itemCrafting.rareSettings.matchAnyMod);
            setMatchPrefixAndSuffix(defaultSettings.itemCrafting.rareSettings.matchPrefixAndSuffix);
            setSelectedRareMods(defaultSettings.itemCrafting.selectedRareMods);
          }
          if (itembase?.rarity === "Magic") {
            setSelectedMagicMods(selectedMagicMods.filter((e) => e.basetype !== itembase.baseType));
            setSelectedRareMods(Object.fromEntries(Object.entries(selectedRareMods)
              .filter(([key]) => !magicModifierCategories?.categoryRegex
                .some(({category}) => key.startsWith(`${itembase.baseType}-${category}-`)))));
            setOnlyIfBothPrefixAndSuffix(defaultSettings.itemCrafting.magicSettings.onlyIfBothPrefixAndSuffix);
            setMatchOpenAffix(defaultSettings.itemCrafting.magicSettings.matchOpenAffix);
          }
          setEnableCustomText(defaultSettings.itemCrafting.customText.enabled);
          setCustomTextStr(defaultSettings.itemCrafting.customText.value);
        }}
        customText={customTextStr}
        setCustomText={setCustomTextStr}
        enableCustomText={enableCustomText}
        setEnableCustomText={setEnableCustomText}
        enableBug={true}
      />
      <ItemInfoBanner/>
      {loading && <Spinner className="item-loading" label={`Loading ${RepoeLanguage[lang].name} item data…`}/>}

      <ItemBaseSelector itemBase={itembase} basetypes={basetypes} setItemBase={setItembase}
                        nonMagicalBase={nonMagicalBase}
                        onlyMagicBase={onlyMagicBase}/>
      {itembase && <h2 className="item-selected-header">Selected: <span
          className={"item-" + itembase.rarity}>{itembase.item}</span></h2>}
      <Checkbox className="item-crafting-checkbox" label="Match similar item bases" value={matchSimilarBases}
                onChange={setMatchSimilarBases}/>
      <SimilarItemsInfo similarItems={similarItems}/>
      {regexMods && itembase?.rarity === "Rare" && <ModWarning itemRegex={regexMods}/>}
      <div className="break"/>
      {itembase && regexMods && itembase.rarity === "Rare" &&
          <div>
              <RareItemMatchSettings
                  matchAnyMod={matchAnyMod}
                  setMatchAnyMod={setMatchAnyMod}
                  matchPrefixAndSuffix={matchPrefixAndSuffix}
                  setMatchPrefixAndSuffix={setMatchPrefixAndSuffix}
              />
              <RareItemSelect
                  itemRegex={regexMods}
                  itembase={itembase}
                  displayTiers={true}
                  setSelected={setSelectedRareMods}
                  selected={selectedRareMods}
              />
          </div>
      }
      {
        itembase && magicNameCategories && magicModifierCategories && itembase.rarity === "Magic" &&
          <div>
              <MagicItemMatchSettings
                  onlyIfBothPrefixAndSuffix={onlyIfBothPrefixAndSuffix}
                  setOnlyIfBothPrefixAndSuffix={setOnlyIfBothPrefixAndSuffix}
                  matchOpenAffix={matchOpenAffix}
                  setMatchOpenAffix={setMatchOpenAffix}
              />
              <MagicItemSelect
                  itemRegex={magicNameCategories}
                  itembase={itembase}
                  selected={selectedMagicMods}
                  setSelected={setSelectedMagicMods}
              />
              <RareItemSelect
                  itemRegex={magicModifierCategories}
                  itembase={itembase}
                  displayTiers={false}
                  setSelected={setSelectedRareMods}
                  selected={selectedRareMods}
              />
          </div>
      }
    </>
  )

}

export default Item;
