import {Itembase} from "@shared/core/item/ItemBaseSelector";
import {RareModSelection} from "@shared/core/item/RareItemSelect";
import {SelectedMagicMod} from "@shared/core/item/MagicItemSelect";

export interface ItemCraftingSettings {
  itembase: Itembase | undefined;
  matchSimilarBases: boolean;
  selectedRareMods: { [p: string]: RareModSelection };
  selectedMagicMods: SelectedMagicMod[];
  rareSettings: {
    matchAnyMod: boolean;
    matchPrefixAndSuffix: boolean;
  };
  magicSettings: {
    onlyIfBothPrefixAndSuffix: boolean;
    matchOpenAffix: boolean;
  };
  customText: {
    value: string;
    enabled: boolean;
  };
}

export const itemCraftingDefault: ItemCraftingSettings = {
  itembase: undefined,
  matchSimilarBases: true,
  selectedRareMods: {},
  selectedMagicMods: [],
  rareSettings: {
    matchAnyMod: false,
    matchPrefixAndSuffix: false,
  },
  magicSettings: {
    onlyIfBothPrefixAndSuffix: false,
    matchOpenAffix: true,
  },
  customText: {
    value: "",
    enabled: true,
  },
}