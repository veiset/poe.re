import React, {Dispatch, SetStateAction, useContext, useEffect, useState} from "react";
import {HeaderWithLanguage} from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import ModSearchBox from "@shared/components/ModSearchBox";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {defaultSettings, UltimatumSettings} from "@poe/utils/SavedSettings";
import {loadUltimatum} from "@poe/utils/loadData";
import type {Ultimatum as UltimatumData} from "@shared/typedefs/poe1/Ultimatum";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";
import {generateUltimatumRegex, ignoresSacrifices, uniqueRewardId} from "./UltimatumOutput";
import "./Ultimatum.css";

interface Option {
  id: string
  text: string
  title?: string
  icon?: string
}

interface OptionListProps {
  title: string
  options: Option[]
  selected: string[]
  setSelected: Dispatch<SetStateAction<string[]>>
  search?: boolean
}

const OptionList = ({title, options, selected, setSelected, search: searchable}: OptionListProps) => {
  const [search, setSearch] = useState("");
  const id = `ultimatum-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="ultimatum-card">
      <div className="ultimatum-card-header"><span className="ultimatum-card-title">{title}</span></div>
      {searchable && <div className="half-size box-small-padding">
        <ModSearchBox id={id} search={search} setSearch={setSearch}/>
      </div>}
      <div className="ultimatum-list">
        {options
          .filter((option) => !search || `${option.text} ${option.title ?? ""}`.toLowerCase().includes(search.toLowerCase()))
          .map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <div key={option.id} title={option.title}
                   className={isSelected ? "selectable-item selected-mod" : "selectable-item"}
                   onClick={() => setSelected(isSelected ? selected.filter((s) => s !== option.id) : selected.concat(option.id))}>
                {option.icon && <img className="ultimatum-icon" alt="" src={`https://web.poecdn.com/image/${option.icon}`}/>}
                {option.text}
              </div>
            );
          })}
      </div>
    </div>
  );
};

const Ultimatum = () => {
  const {globalProfile, lang} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("ultimatum", storedProfile.ultimatum);
  const profile = {...storedProfile, ultimatum: favoritePage.initialConfiguration};
  const [data, setData] = useState<UltimatumData>();
  const [avoidModifiers, setAvoidModifiers] = useState(profile.ultimatum.avoidModifiers);
  const [rewards, setRewards] = useState(profile.ultimatum.rewards);
  const [sacrifices, setSacrifices] = useState(profile.ultimatum.sacrifices);

  useEffect(() => {
    let active = true;
    loadUltimatum(lang).then((loaded) => {
      if (active) setData(loaded);
    });
    return () => { active = false; };
  }, [lang]);

  const settings: UltimatumSettings = {avoidModifiers, rewards, sacrifices};
  const result = generateUltimatumRegex(settings, data);

  useEffect(() => {
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, ultimatum: settings}));
  }, [avoidModifiers, rewards, sacrifices]);

  return <>
    <HeaderWithLanguage text="Inscribed Ultimatum"/>
    <RegexResultBox result={result}
                    warning={ignoresSacrifices(settings) ? "Sacrifices are ignored with a unique item reward: it can only be found by excluding the other rewards." : undefined}
                    favorite={favoritePage.action(settings, {language: lang})}
                    reset={() => {
                      setAvoidModifiers(defaultSettings.ultimatum.avoidModifiers);
                      setRewards(defaultSettings.ultimatum.rewards);
                      setSacrifices(defaultSettings.ultimatum.sacrifices);
                    }}/>
    <OptionList title="Rewards" selected={rewards} setSelected={setRewards}
                options={[
                  ...(data?.rewards ?? []).map((reward) => ({id: reward.id, text: reward.reward})),
                  {id: uniqueRewardId, text: "Unique item", title: "Sacrifice a unique item for a random unique item"},
                ]}/>
    <OptionList title="Sacrifices" selected={sacrifices} setSelected={setSacrifices}
                options={(data?.sacrifices ?? []).map((sacrifice) => ({
                  id: sacrifice.id,
                  text: `${sacrifice.name} (${sacrifice.amounts.join(", ")})`,
                  title: sacrifice.reward,
                  icon: sacrifice.icon,
                }))}/>
    <OptionList title="Modifiers to avoid" search selected={avoidModifiers} setSelected={setAvoidModifiers}
                options={(data?.modifiers ?? []).map((modifier) => ({id: modifier.id, text: modifier.name, title: modifier.description}))}/>
  </>;
};

export default Ultimatum;
