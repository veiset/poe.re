import type {Token} from "@poe/types/generated/mapmods";
import React, {Dispatch, ReactNode, SetStateAction} from "react";
import SelectableSearch from "./SelectableSearch";
import {regexSearch} from "../../utils/regex/ReverseRegexLookup";
import "./SelectableTokenList.css";


export interface SelectableTokenListProps {
  elements: Token<any>[];
  selected: number[]
  setSelected: Dispatch<SetStateAction<number[]>>
  sortFn?: (a: Token<any>, b: Token<any>) => number
  colorFun?: (isSelected: boolean, token: Token<any>) => string
  displayFun?: (v: string) => string
  tagFn?: (token: Token<any>) => ReactNode | null
  groupFn?: (token: Token<any>) => {key: string, label: string} | null
  groupOrder?: string[]
}

const SelectableTokenList = (props: SelectableTokenListProps) => {
  const {elements, selected, setSelected, sortFn, colorFun, displayFun, tagFn, groupFn, groupOrder} = props;
  const [search, setSearch] = React.useState("");
  const sorting = sortFn ?? defaultSort;
  const colorFunction = colorFun ?? defaultColorFun;
  const displayValue = displayFun ?? defaultDisplayFun;

  const visible = elements
    .filter((token) => {
      const regexMatch = regexSearch(token.rawText.toLowerCase(), search);
      const regularMatch = !search || search.toLowerCase().trim().split(" ")
        .every(q => token.rawText.toLowerCase().includes(q));
      return regularMatch || regexMatch;
    })
    .sort(sorting);

  const renderRow = (token: Token<any>) => {
    const isSelected = selected.includes(token.id);
    const className = isSelected ?
      "selectable-token-list-selectable selectable-token-list-selected" :
      "selectable-token-list-selectable";
    const colorValue = colorFunction(isSelected, token)
    const style = !isSelected ? {color: colorValue} : undefined;
    const tag = tagFn?.(token);

    return (
      <div key={token.id}
           style={style}
           className={className}
           onClick={() => {
             isSelected
               ? setSelected(selected.filter(selectedToken => selectedToken !== token.id))
               : setSelected(selected.concat(token.id).sort((n1, n2) => n1 - n2));
           }}
      >
        {tag}
        <span className="selectable-token-list-text">{displayValue(token.rawText.replaceAll("|", " · "))}</span>
      </div>
    );
  };

  const renderContent = (): ReactNode => {
    if (!groupFn) return visible.map(renderRow);

    const groups = new Map<string, {label: string, tokens: Token<any>[]}>();
    for (const token of visible) {
      const g = groupFn(token);
      if (!g) continue;
      const existing = groups.get(g.key);
      if (existing) existing.tokens.push(token);
      else groups.set(g.key, {label: g.label, tokens: [token]});
    }

    const orderedKeys = groupOrder
      ? groupOrder.filter((k) => groups.has(k)).concat(Array.from(groups.keys()).filter((k) => !groupOrder.includes(k)))
      : Array.from(groups.keys());

    return orderedKeys.map((key) => {
      const g = groups.get(key)!;
      return (
        <div key={key} className="selectable-token-list-group">
          <div className="selectable-token-list-group-header">{g.label}</div>
          {g.tokens.map(renderRow)}
        </div>
      );
    });
  };

  return (
    <>
      <SelectableSearch search={search} setSearch={setSearch}/>
      <div className="selectable-token-list-mod-list">
        {renderContent()}
      </div>
    </>
  );
}

const defaultSort = (a: Token<any>, b: Token<any>): number => {
  if (a.rawText === b.rawText) return 0
  return a.rawText > b.rawText ? 1 : -1
}

const defaultColorFun = (isSelected: boolean, t: Token<any>): string => "";

const defaultDisplayFun = (v: string) => v;

export default SelectableTokenList;
