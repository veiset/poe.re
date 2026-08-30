import React, {useContext, useEffect, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import ItemBaseSelector, {Itembase} from "./ItemBaseSelector";
import "./Item.css";
import {ItemAffixRegex, ItemRegex, itemRegex} from "@poe/generated/GeneratedItemModsPOE1";
import RareItemSelect, {RareModSelection} from "./RareItemSelect";
import ModWarning from "./ModWarning";
import {generateMagicItemRegex, generateRareItemRegex} from "./ItemOuput";
import {defaultSettings, ItemCraftingSettings} from "@poe/utils/SavedSettings";
import MagicItemSelect, {SelectedMagicMod} from "./MagicItemSelect";
import Infobox from "@poe/components/infobox/Infobox";
import InfoBanner from "@poe/components/InfoBanner/InfoBanner";
import item from "./Item";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";

const Item = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("items", storedProfile.itemCrafting);
  const profile = {...storedProfile, itemCrafting: favoritePage.initialConfiguration};

  const affixMap: Record<string, ItemAffixRegex> = Object.entries(itemRegex)
    .flatMap(([basetype, item]) =>
      item.categoryRegex.flatMap(cat =>
        cat.modifiers.map(mod => ({
          key: `${basetype}-${cat.category}-${mod.desc}`,
          value: mod
        }))
      )
    )
    .reduce<Record<string, ItemAffixRegex>>((acc, {key, value}) => {
      acc[key] = value;
      return acc;
    }, {});

  const [result, setResult] = useState<string>("");
  const [itembase, setItembase] = useState<Itembase | undefined>(profile.itemCrafting.itembase);
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
  const nonMagicBases = ["heist"];
  const currentSettings: ItemCraftingSettings = {
    itembase, selectedRareMods, selectedMagicMods,
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
    }
  }, [itembase]);

  useEffect(() => {
    if (itembase && itembase.rarity === "Rare") {
      setResult(generateRareItemRegex(affixMap, currentSettings));
    }
    if (itembase && itembase.rarity === "Magic") {
      setResult(generateMagicItemRegex(currentSettings));
    }
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, itemCrafting: currentSettings}));
  }, [selectedRareMods, selectedMagicMods, itembase, onlyIfBothPrefixAndSuffix, matchOpenAffix, matchAnyMod, matchPrefixAndSuffix, customTextStr, enableCustomText]);

  return (<>
      <Header text={"Item"}/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(currentSettings, {language: storedProfile.language})}
        reset={() => {
          setNonMagicalBase(false);
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
      <InfoBanner>
        <ul>
          <li>Clusters are missing notables</li>
          <li>Open prefix/suffix doesn't work for magic synth items</li>
          <li>Magic items with influenced mods will match any tier of the influenced mod</li>
          <li>Some ranges can be weird (the data is a bit weird)</li>
        </ul>
      </InfoBanner>

      <ItemBaseSelector itemBase={itembase} setItemBase={setItembase} nonMagicalBase={nonMagicalBase}/>
      {itembase && <h2>Selected: <span className={"item-" + itembase.rarity}>{itembase.item}</span></h2>}
      {regexMods && itembase?.rarity === "Rare" && <ModWarning itemRegex={regexMods}/>}
      <div className="break"/>
      {itembase && regexMods && itembase.rarity === "Rare" &&
          <div>
              <div className="radio-button-modgroup">
                  <input type="radio" className="radio-button-map" id="rare-mods-all" name="Match any rare mod"
                         defaultChecked={!matchAnyMod && !matchPrefixAndSuffix}
                         checked={!matchAnyMod && !matchPrefixAndSuffix}
                         onChange={v => {
                             setMatchAnyMod(false);
                             setMatchPrefixAndSuffix(false);
                         }}/>
                  <label htmlFor="rare-mods-all" className="radio-button-map radio-first-ele">Match if only ALL mods are
                      found</label>
                  <input type="radio" id="rare-mods-any" name="Match all rare mods" defaultChecked={matchAnyMod}
                         checked={matchAnyMod}
                         onChange={v => {
                             setMatchAnyMod(true);
                             setMatchPrefixAndSuffix(false);
                         }}/>
                  <label htmlFor="rare-mods-any" className="radio-button-map">Match if ANY mod is found</label>
                  <input type="radio" id="rare-mods-prefix-suffix" name="Match all rare mods" defaultChecked={matchPrefixAndSuffix}
                         checked={matchPrefixAndSuffix}
                         onChange={v => {
                             setMatchPrefixAndSuffix(true);
                             setMatchAnyMod(false);
                         }}/>
                  <label htmlFor="rare-mods-prefix-suffix" className="radio-button-map">Match at least 1 Prefix AND 1 Suffix</label>
              </div>
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
              <div className="radio-button-modgroup">
                  <input type="radio" className="radio-button-map" id="magic-mods-default" name="Magic mod matching"
                         defaultChecked={!onlyIfBothPrefixAndSuffix && !matchOpenAffix}
                         checked={!onlyIfBothPrefixAndSuffix && !matchOpenAffix}
                         onChange={v => {
                             setOnlyIfBothPrefixAndSuffix(false);
                             setMatchOpenAffix(false);
                         }}/>
                  <label htmlFor="magic-mods-default" className="radio-button-map radio-first-ele">Match if ANY mod is found</label>
                  <input type="radio" id="magic-mods-both" name="Magic mod matching"
                         defaultChecked={onlyIfBothPrefixAndSuffix}
                         checked={onlyIfBothPrefixAndSuffix}
                         onChange={v => {
                             setOnlyIfBothPrefixAndSuffix(true);
                             setMatchOpenAffix(false);
                         }}/>
                  <label htmlFor="magic-mods-both" className="radio-button-map">Match at least 1 Prefix AND 1 Suffix</label>
                  <input type="radio" id="magic-mods-open" name="Magic mod matching"
                         defaultChecked={matchOpenAffix && !onlyIfBothPrefixAndSuffix}
                         checked={matchOpenAffix && !onlyIfBothPrefixAndSuffix}
                         onChange={v => {
                             setMatchOpenAffix(true);
                             setOnlyIfBothPrefixAndSuffix(false);
                         }}/>
                  <label htmlFor="magic-mods-open" className="radio-button-map">Match an open prefix or suffix</label>
                  <input type="radio" id="magic-mods-open-and-correct-affix" name="Magic mod matching"
                         defaultChecked={matchOpenAffix && onlyIfBothPrefixAndSuffix}
                         checked={matchOpenAffix && onlyIfBothPrefixAndSuffix}
                         onChange={v => {
                           setMatchOpenAffix(true);
                           setOnlyIfBothPrefixAndSuffix(true);
                         }}/>
                  <label htmlFor="magic-mods-open-and-correct-affix" className="radio-button-map">Match both affixes, but allow for open prefix or suffix</label>
              </div>
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
