import JewelModList from "./JewelModList";
import React from "react";
import type {JewelRegex} from "@poe/types/generated/jewel";

export interface JewelModsProps {
  mods: JewelRegex[]
  selected: string[]
  setSelected: (selected: string[]) => void
}

const JewelMods = (props: JewelModsProps) => {

  const {mods, selected, setSelected} = props;

  return (
    <>
      <div className="jewel-mod-column">
        <div className="jewel-mod-column-header">
          <span className="jewel-mod-column-title">Prefix</span>
        </div>
        <JewelModList
          id="prefix"
          affixes={mods.filter((e) => e.isPrefix)}
          selected={selected}
          setSelected={setSelected}
        />
      </div>
      <div className="jewel-mod-column">
        <div className="jewel-mod-column-header">
          <span className="jewel-mod-column-title">Suffix</span>
        </div>
        <JewelModList
          id="suffix"
          affixes={mods.filter((e) => !e.isPrefix)}
          selected={selected}
          setSelected={setSelected}
        />
      </div>
    </>
  )
}

export default JewelMods;
