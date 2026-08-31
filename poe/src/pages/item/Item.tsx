import React, {useContext, useEffect, useState} from "react";
import {itemRegex} from "@poe/generated/GeneratedItemModsPOE1";
import {basetypes} from "@poe/generated/GeneratedItemBasesPOE1";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import Header from "@poe/components/Header";
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
import {ItemAffixRegex, ItemRegex} from "@shared/types/GeneratedItemMod.Types";
import {findSimilarBases, groupAffixes} from "@shared/core/item/GroupUtils";
import {ItemCraftingSettings} from "@shared/types/Settings.types";
import "./Item.css";

const Item = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("items", storedProfile.itemCrafting);
  const profile = {...storedProfile, itemCrafting: favoritePage.initialConfiguration};
  const [result, setResult] = useState<string>("");

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
      setRegexMods(itemRegex[itembase.baseType]);
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
  }, [itembase]);

  useEffect(() => {
    if (itembase && itembase.rarity === "Rare") {
      setResult(generateRareItemRegex(affixMap, currentSettings));
    }
    if (itembase && itembase.rarity === "Magic") {
      setResult(generateMagicItemRegex(currentSettings, basetypes));
    }
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({
      ...latest,
      itemCrafting: currentSettings
    }));
  }, [selectedRareMods, selectedMagicMods, itembase, onlyIfBothPrefixAndSuffix, matchOpenAffix, matchAnyMod, matchPrefixAndSuffix, customTextStr, enableCustomText, matchSimilarBases]);

  return (<>
      <Header text={"Item"}/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(currentSettings, {language: storedProfile.language})}
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
      <ItemInfoBanner/>

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

export default Item;
