import {Itembase} from "./ItemBaseSelector";
import GroupedTokenList, {GroupedTokens} from "@poe/components/GroupedTokenList/GroupedTokenList";
import React from "react";
import {ItemAffixRegex} from "@poe/generated/GeneratedItemModsPOE1";
import {categoryOrder, cleanCategoryName, groupedCategory} from "@shared/core/item/GroupUtils";
import {Affix, CategoryRegex, ItemRegex} from "@shared/types/GeneratedItemMod.Types";

interface MagicItemSelectProps {
  itemRegex: ItemRegex
  itembase: Itembase
  selected: SelectedMagicMod[]
  setSelected: (selected: SelectedMagicMod[]) => void
}

type AffixType = "PREFIX" | "SUFFIX";

export interface SelectedMagicMod {
  basetype: string
  category: string
  regex: Affix
  affix: AffixType
  desc: string
}

const MagicItemSelect = (props: MagicItemSelectProps) => {
  const {itembase, itemRegex, selected, setSelected} = props;

  const filteredCategories: CategoryRegex[] = itemRegex.categoryRegex
  const groupedCategories = groupedCategory(filteredCategories);

  return (<>
    {Object.values(groupedCategories)
      .sort((a, b) => categoryOrder(a[0], b[0]))
      .map((e) => {
        const prefix: CategoryRegex = e[0];
        const suffix: CategoryRegex = e[1];

        const affixes: Affix[] = ((prefix.modifiers).concat(suffix?.modifiers ?? []).flatMap((e) => e.affixes));

        const toggle = (key: string, category: string, affix: AffixType) => {
          const mod: SelectedMagicMod = {
            basetype: itemRegex.basetype,
            category: category,
            regex: affixes.find((a) => a.name === key)!!,
            affix: affix,
            desc: key
          };
          const isSelected = selected.find((e) => e.desc === key && e.basetype === itemRegex.basetype);

          isSelected
          ? setSelected(selected.filter((e) => e.desc !== key || e.basetype !== itemRegex.basetype))
          : setSelected(selected.concat(mod));
        }

        return (<div className="rare-mod-group full-size row">
          <div className="eq-col-2">
            <h2>{cleanCategoryName(prefix.category)}</h2>
            <GroupedTokenList
              disableSearch={true}
              groups={modsToGroupedTokens(prefix.modifiers)}
              selected={selected.filter((e) => e.basetype === itembase.baseType).map((e) => e.desc)}
              setSelected={(key: string) => toggle(key, prefix.category, "PREFIX")}
            />
          </div>
          {suffix && <div className="eq-col-2">
              <h2>{cleanCategoryName(suffix.category)}</h2>
              <GroupedTokenList
                  disableSearch={true}
                  groups={modsToGroupedTokens(suffix.modifiers)}
                  selected={selected.filter((e) => e.basetype === itembase.baseType).map((e) => e.desc)}
                  setSelected={(key: string) => toggle(key, suffix.category, "SUFFIX")}
              />
          </div>
          }
        </div>)
      })}
  </>)
}

function modsToGroupedTokens(modifiers: ItemAffixRegex[] | undefined): GroupedTokens[] {
  if (modifiers === undefined) return [];
  return modifiers.map((mod) => ({
    groupName: mod.desc,
    tokens: mod.affixes.map((e) => e.name).reverse()
  }))
}

export default MagicItemSelect;