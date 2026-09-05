import React, {Dispatch, SetStateAction, useEffect, useMemo} from "react";
import ModSearchBox from "@shared/components/ModSearchBox";
import "./GemNameList.css";
import type {GemOption, Token} from "@poe/types/generated/gems";

export interface GemNameListProps {
  id: string
  gems: Token<GemOption>[]
  selected: number[]
  setSelected: Dispatch<SetStateAction<number[]>>
}

const gemColorOrder: Record<string, number> = {'r': 1, 'g': 2, 'b': 3, 'w': 4}
const gemSortFn = (a: Token<GemOption>, b: Token<GemOption>) => {
  const aSortKey = gemColorOrder[a.options.c] + a.rawText
  const bSortKey = gemColorOrder[b.options.c] + b.rawText
  return aSortKey.localeCompare(bSortKey)
}

const GemNameList = (props: GemNameListProps) => {
  const {id, gems, selected, setSelected} = props;
  const [search, setSearch] = React.useState("");

  useEffect(() => {
  }, [selected]);

  const sortedGemList = gems.sort(gemSortFn);

  return (
    <>
      <div className="half-size box-small-padding">
        <ModSearchBox id={id} search={search} setSearch={setSearch} placeholder={"Search for a Gem..."}/>
      </div>
      <div className="gem-name-list">
        {sortedGemList
          .filter((gem) => !search || gem.rawText.toLowerCase().includes(search.toLowerCase()))
          .map((v) => {
            const isSelected = selected.includes(v.id);
            let className = `selectable-item gem-${v.options.c}`;
            if (isSelected) className += ' selected-mod';
            return (
              <div key={v.id}
                   className={className}
                   onClick={() => {
                     isSelected
                       ? setSelected(selected.filter(m => m !== v.id))
                       : setSelected(selected.concat(v.id));
                   }}
              >
                {v.rawText.replaceAll("|", " ")}
              </div>
            );
          })}
      </div>
    </>
  );

}

export default GemNameList;
