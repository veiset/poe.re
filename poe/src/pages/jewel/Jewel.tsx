import React, {useContext, useEffect, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import {defaultSettings, JewelSettings} from "@poe/utils/SavedSettings";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import type {Jewel} from "@poe/types/generated/jewel";
import {loadJewel} from "@poe/utils/loadData";
import JewelMods from "./JewelMods";
import {generateJewelRegex} from "./JewelOutput";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import "./Jewel.css";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";


const Jewel = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("jewel", storedProfile.jewel);
  const profile = {...storedProfile, jewel: favoritePage.initialConfiguration};
  const [jewel, setJewel] = useState<Jewel>();

  useEffect(() => {
    loadJewel().then(setJewel);
  }, []);

  const regularMods = jewel?.regular ?? [];
  const abyssMods = jewel?.abyss ?? [];
  const regularModText = regularMods.map((e) => e.mod);
  const abyssModText = abyssMods.map((e) => e.mod);

  const [allMatch, setAllMatch] = useState(profile.jewel.allMatch);
  const [magicOnly, setMagicOnly] = useState(profile.jewel.magicOnly);
  const [abyssJewel, setAbyssJewel] = useState(profile.jewel.abyssJewel);
  const [selectedRegular, setSelectedRegular] = useState<string[]>(profile.jewel.selectedRegular.filter((e) => regularModText.includes(e)));
  const [selectedAbyss, setSelectedAbyss] = useState<string[]>(profile.jewel.selectedAbyss.filter((e) => abyssModText.includes(e)));
  const [matchBothPrefixAndSuffix, setMatchBothPrefixAndSuffix] = React.useState(profile.jewel.matchBothPrefixAndSuffix);
  const [matchOpenPrefixSuffix, setMatchOpenPrefixSuffix] = React.useState(profile.jewel.matchOpenPrefixSuffix);

  const [result, setResult] = useState("");
  const settings: JewelSettings = {allMatch, magicOnly, abyssJewel, selectedRegular, selectedAbyss, matchBothPrefixAndSuffix, matchOpenPrefixSuffix};

  useEffect(() => {
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, jewel: {...settings}}));
    setResult(generateJewelRegex(settings, jewel));
  }, [allMatch, magicOnly, abyssJewel, selectedRegular, selectedAbyss, matchOpenPrefixSuffix, matchBothPrefixAndSuffix, jewel]);

  return (
    <>
      <Header text={"Jewel"}/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action(settings, {language: storedProfile.language})}
        warning={undefined}
        reset={() => {
          setSelectedRegular(defaultSettings.jewel.selectedRegular);
          setSelectedAbyss(defaultSettings.jewel.selectedAbyss);
        }}
      />
      <div className="break"/>
      <div className="filter-card-grid">
        <FilterCard title="Settings">
          <div className="jewel-type-row">
            <span className="jewel-type-label">Jewel type</span>
            <div className="radio-button-modgroup">
              <input type="radio" className="radio-button-map" id="jewel-regular" name="regular jewel"
                     defaultChecked={!abyssJewel}
                     checked={!abyssJewel}
                     onChange={v => setAbyssJewel(false)}/>
              <label htmlFor="jewel-regular" className="radio-button-map radio-first-ele">Regular Jewel</label>
              <input type="radio" id="jewel-abyss" name="abyss jewel" defaultChecked={abyssJewel}
                     checked={abyssJewel}
                     onChange={v => setAbyssJewel(true)}/>
              <label htmlFor="jewel-abyss" className="radio-button-map">Abyss Jewel</label>
            </div>
          </div>
          <div className="jewel-card-divider"/>
          <Checkbox label="Magic Jewels only" value={magicOnly}
                    onChange={setMagicOnly}/>
          {magicOnly
            ? <>
              <Checkbox label="Require that both prefix and suffix matches" value={matchBothPrefixAndSuffix}
                        onChange={setMatchBothPrefixAndSuffix}/>
              <Checkbox label="Match open prefix or open suffix" value={matchOpenPrefixSuffix}
                        onChange={setMatchOpenPrefixSuffix}/>
            </>
            : <Checkbox label="Should match all selected mods" value={allMatch}
                        onChange={setAllMatch}/>
          }
          {abyssJewel && magicOnly &&
            <p className="jewel-warn">Warning: Only max modifier tier (T1) is matched when rolling magical abyssal jewels.</p>
          }
        </FilterCard>
      </div>

      <div className="jewel-mod-picker">
        {abyssJewel
          ? <JewelMods mods={abyssMods} selected={selectedAbyss} setSelected={setSelectedAbyss}/>
          : <JewelMods mods={regularMods} selected={selectedRegular} setSelected={setSelectedRegular}/>
        }
      </div>
    </>
  );
}


export default Jewel;
