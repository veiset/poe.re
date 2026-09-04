import ModSearchBox from "@shared/components/ModSearchBox";
import {useState} from "react";
import type {JewelRegex} from "@poe/types/generated/jewel";

export interface JewelModListProps {
  id: string
  affixes: JewelRegex[]
  selected: string[]
  setSelected: (selected: string[]) => void
}

const JewelModList = (props: JewelModListProps) => {

  const {id, affixes, selected, setSelected} = props;

  const [search, setSearch] = useState("");

  return (
    <div>
      <ModSearchBox id={id} search={search} setSearch={setSearch}/>
      <div className="mod-list">
        {affixes.filter((e) => {
          return search.length < 2 || e.mod.toLowerCase().includes(search.toLowerCase())
        }).map((e) => {
          const isSelected = selected.includes(e.mod);
          return (
            <div
              className={isSelected ? "selectable-item selected-mod" : "selectable-item"}
              onClick={() => {
                isSelected
                  ? setSelected(selected.filter(m => m !== e.mod))
                  : setSelected(selected.concat(e.mod));
              }}
            >
              {e.mod}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default JewelModList;
