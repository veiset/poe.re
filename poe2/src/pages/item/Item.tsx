import React, {useContext, useEffect, useState} from "react";
import {Poe2ProfileContext} from "../../layout/Poe2ProfileContext";
import {defaultSettings} from "../../settings";
import {loadSettings, updateSettings} from "../../localStorage";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import Poe2Header from "@poe2/components/Poe2Header";
import {useFavoritePage} from "@poe2/useFavoritePage";
import type {BaseType, ItemAffixRegex, ItemRegex} from "@shared/generated/item";
import {loadItemBasetypes, loadItemRegex} from "../../utils/loadData";
import {findSimilarBases, groupAffixes} from "@shared/core/item/GroupUtils";
import RareItemSelect, {RareModSelection} from "@shared/core/item/RareItemSelect";
import MagicItemSelect, {SelectedMagicMod} from "@shared/core/item/MagicItemSelect";
import {ItemCraftingSettings} from "@shared/types/Settings.types";
import {generateMagicItemRegex, generateRareItemRegex} from "@shared/core/item/ItemOutput";
import ItemBaseSelector, {Itembase} from "@shared/core/item/ItemBaseSelector";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import SimilarItemsInfo from "@shared/components/item/SimilarItemsInfo";
import ModWarning from "@shared/core/item/ModWarning";
import RareItemMatchSettings from "@shared/components/item/RareItemMatchSettings";
import MagicItemMatchSettings from "@shared/components/item/MagicItemMatchSettings";
import "./Item.css";

export function Item() {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const storedProfile = loadSettings(currentProfile);
  const favoritePage = useFavoritePage("item", storedProfile.itemCrafting);
  const [result, setResult] = useState("");
  const [basetypes, setBasetypes] = useState<BaseType[]>([]);
  const [itemRegex, setItemRegex] = useState<ItemRegex[]>([]);
  const profile = {...storedProfile, itemCrafting: favoritePage.initialConfiguration};

  const affixMap: Record<string, ItemAffixRegex> = groupAffixes(itemRegex);

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

  useEffect(() => {
    Promise.all([loadItemBasetypes(), loadItemRegex()]).then(([bases, regex]) => {
      setBasetypes(bases);
      setItemRegex(regex);
    });
  }, []);

  const similarItems = matchSimilarBases && itembase ?
    findSimilarBases(itembase.baseType, itembase.item, basetypes) : [];

  const currentSettings: ItemCraftingSettings = {
    itembase, matchSimilarBases, selectedRareMods, selectedMagicMods,
    rareSettings: {matchAnyMod, matchPrefixAndSuffix},
    magicSettings: {onlyIfBothPrefixAndSuffix, matchOpenAffix},
    customText: {value: customTextStr, enabled: enableCustomText},
  };

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
    if (itembase && itembase.rarity === "Rare") {
      setResult(generateRareItemRegex(affixMap, currentSettings));
    }
    if (itembase && itembase.rarity === "Magic") {
      setResult(generateMagicItemRegex(currentSettings, basetypes));
    }
    if (!favoritePage.isEditingFavorite) updateSettings(currentProfile, (latest) => ({
      ...latest,
      itemCrafting: currentSettings
    }));
  }, [selectedRareMods, selectedMagicMods, itembase, onlyIfBothPrefixAndSuffix, matchOpenAffix, matchAnyMod, matchPrefixAndSuffix, customTextStr, enableCustomText, matchSimilarBases, itemRegex, basetypes]);

  return (<>
      <Poe2Header text={"Item"}/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(currentSettings)}
        reset={() => {
          setNonMagicalBase(false);
          setMatchSimilarBases(defaultSettings.itemCrafting.matchSimilarBases);
          if (itembase?.rarity === "Rare") {
            setMatchAnyMod(defaultSettings.itemCrafting.rareSettings.matchAnyMod);
            setMatchPrefixAndSuffix(defaultSettings.itemCrafting.rareSettings.matchPrefixAndSuffix);
            setSelectedRareMods(defaultSettings.itemCrafting.selectedRareMods);
          }
          if (itembase?.rarity === "Magic") {
            // setSelectedMagicMods(defaultSettings.itemCrafting.selectedMagicMods);
            setSelectedMagicMods(selectedMagicMods.filter((e) => e.basetype !== itembase.baseType));
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
        itembase && regexMods && itembase.rarity === "Magic" &&
          <div>
              <MagicItemMatchSettings
                  onlyIfBothPrefixAndSuffix={onlyIfBothPrefixAndSuffix}
                  setOnlyIfBothPrefixAndSuffix={setOnlyIfBothPrefixAndSuffix}
                  matchOpenAffix={matchOpenAffix}
                  setMatchOpenAffix={setMatchOpenAffix}
              />
              <MagicItemSelect
                  itemRegex={regexMods}
                  itembase={itembase}
                  selected={selectedMagicMods}
                  setSelected={setSelectedMagicMods}
              />
          </div>
      }
    </>
  )
}
