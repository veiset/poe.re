import React, {useEffect, useMemo, useState} from "react";
import Dropdown from "@shared/components/dropdown/Dropdown";
import "./ItemBaseSelector.css";
import type {BaseType} from "@shared/generated/item";

type Rarity = "Magic" | "Rare";

export interface Itembase {
  baseType: string,
  item: string,
  rarity: Rarity,
}

interface ItemBaseSelectorProps {
  setItemBase: (itemBase: Itembase) => void
  itemBase: Itembase | undefined
  nonMagicalBase: boolean
  onlyMagicBase: boolean
  basetypes: BaseType[]
}

const ItemBaseSelector = (props: ItemBaseSelectorProps) => {
  const {setItemBase, itemBase, nonMagicalBase, onlyMagicBase, basetypes} = props;
  const search = useMemo(() => basetypes.flatMap((base) => base.items.map((item) => ({baseType: base.name, item, label: `${base.name} - ${item}`}))), [basetypes]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return value ? search.filter((entry) => entry.label.toLocaleLowerCase().includes(value)).slice(0, 20) : [];
  }, [query, search]);

  const rarity: Rarity[] = ["Magic", "Rare"];
  const [selectedRarity, setSelectedRarity] = useState(itemBase?.rarity ?? "Rare");

  const selectBase = (entry: typeof search[number]) => {
    setItemBase({baseType: entry.baseType, item: entry.item, rarity: selectedRarity});
    setQuery(entry.label);
    setOpen(false);
  };

  useEffect(() => {
    if (itemBase) {
      setItemBase({...itemBase, rarity: selectedRarity})
    }
  }, [selectedRarity]);

  return (<>
    <div className="full-size generic-top-element">
      <h2>Select item base</h2>
      <div id="search" className="item-search">
        <input className="item-search-input" role="combobox" aria-expanded={open && matches.length > 0} aria-controls="item-base-options"
          aria-autocomplete="list" value={query} placeholder="Search for item"
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!matches.length) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, matches.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === "Enter") { event.preventDefault(); selectBase(matches[activeIndex]); }
            if (event.key === "Escape") setOpen(false);
          }} />
        {open && matches.length > 0 && <ul id="item-base-options" className="item-search-options" role="listbox">
          {matches.map((entry, index) => <li key={entry.label} role="option" aria-selected={index === activeIndex}
            className={index === activeIndex ? "item-search-option-active" : ""}
            onMouseDown={(event) => { event.preventDefault(); selectBase(entry); }}>{entry.label}</li>)}
        </ul>}
      </div>
      <h2>Item rarity</h2>
      {!nonMagicalBase && !onlyMagicBase ?
        <Dropdown
          elements={rarity}
          selected={selectedRarity}
          setSelected={(selected) => {
            setSelectedRarity(selected as Rarity);
          }}
          style={"dropdown-sm"}
        /> : (nonMagicalBase ? <div className="item-rarity-warning">Selected item base only supports rare items</div> :
          <div className="item-rarity-warning">Selected item base only supports magic items</div>)}
    </div>
  </>)
}

export default ItemBaseSelector
