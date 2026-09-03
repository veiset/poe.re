import React from "react";
import {SelectOption} from "../settings";

interface SelectElementProps {
  name: string
  ranges: number[][]
  current: SelectOption
  selected: SelectOption[]
  setSelected: (options: SelectOption[]) => void
}

export function SelectElement(props: SelectElementProps) {
  const {name, ranges, current, selected, setSelected} = props;
  const hasRange = name.includes("#") && ranges[0]?.length >= 2;
  const displayName = name
    .replace(/\|/g, " • ");

  return (
    <div className={`poe2-mod-row ${current.isSelected ? "selectable-item selected-mod" : "selectable-item"}`}>
      {hasRange &&
          <input
              className="numberinput-input poe2-mod-value-input"
              type="text"
              placeholder={ranges[0][0] + "-" + ranges[0][1]}
              value={current.value ?? ""}
              onChange={(e) => {
                setSelected(selected
                  .filter((e) => e.name !== name)
                  .concat({...current, value: Number(e.target.value), isSelected: true}))
              }}
          />
      }
      <span className="poe2-mod-name" onClick={() =>
        setSelected(selected
          .filter((e) => e.name !== name)
          .concat({...current, isSelected: !current.isSelected}))
      }>
        {hasRange && displayName.replace("#", "")}
        {!hasRange && displayName.replace(/##/g, "#")}
      </span>
    </div>
  )
}

export interface SelectListProps {
  id: string
  options: SelectOption[]
  selected: SelectOption[]
  setSelected: (options: SelectOption[]) => void
}

export function SelectList(props: SelectListProps) {
  const {id, options, selected, setSelected} = props;

  return (
    <div key={id}>
      {options.map((mod) => {
        return (
          <div key={mod.name}>
            <SelectElement
              current={selected.find((e) => e.name === mod.name) as SelectOption || mod}
              ranges={mod.ranges}
              name={mod.name}
              selected={selected}
              setSelected={setSelected}
            />
          </div>
        )
      })}
    </div>
  )
}
