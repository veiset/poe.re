import { ContractLevel } from "@poe/pages/heist/Heist";
import { heistContractTypes } from "@poe/generated/GeneratedHeist";
import {
  ItemCategory,
  MagicItemType,
  SelectedMod,
} from "@poe/pages/magicitem/MagicItem";
import { Itembase } from "@poe/pages/item/ItemBaseSelector";
import { RareModSelection } from "@poe/pages/item/RareItemSelect";
import { SelectedMagicMod } from "@poe/pages/item/MagicItemSelect";
import { RepoeLanguage, RepoeLanguageKey } from "./Languages";

export const categories: ItemCategory[] = [
  {
    name: "One Handed Weapons",
    itemType: [
      { name: "Claws", modKey: "Claws" },
      { name: "Daggers", modKey: "Daggers" },
      { name: "Wands", modKey: "Wands" },
      { name: "One Hand Swords", modKey: "One Hand Swords" },
      {
        name: "Thrusting One Hand Swords",
        modKey: "Thrusting One Hand Swords",
      },
      { name: "One Hand Axes", modKey: "One Hand Axes" },
      { name: "One Hand Maces", modKey: "One Hand Maces" },
      { name: "Sceptres", modKey: "Sceptres" },
      { name: "Rune Daggers", modKey: "Rune Daggers" },
    ],
  },
  {
    name: "Two Handed Weapons",
    itemType: [
      { name: "Bows", modKey: "Bows" },
      { name: "Staves", modKey: "Staves" },
      { name: "Two Hand Swords", modKey: "Two Hand Swords" },
      { name: "Two Hand Axes", modKey: "Two Hand Axes" },
      { name: "Two Hand Maces", modKey: "Two Hand Maces" },
      { name: "Warstaves", modKey: "Warstaves" },
      { name: "Fishing Rods", modKey: "Fishing Rods" },
    ],
  },
  {
    name: "Offhand",
    itemType: [
      { name: "Quivers", modKey: "Quivers" },
      { name: "Shields (str)", modKey: "Shields (str)" },
      { name: "Shields (dex)", modKey: "Shields (dex)" },
      { name: "Shields (int)", modKey: "Shields (int)" },
      { name: "Shields (str / dex)", modKey: "Shields (str, dex)" },
      { name: "Shields (str / int)", modKey: "Shields (str, int)" },
      { name: "Shields (dex / int)", modKey: "Shields (dex, int)" },
    ],
  },
  {
    name: "Jewellery",
    itemType: [
      { name: "Amulets", modKey: "Amulets" },
      { name: "Rings", modKey: "Rings" },
      { name: "Belts", modKey: "Belts" },
    ],
  },
  {
    name: "Gloves",
    itemType: [
      { name: "Gloves (str)", modKey: "Gloves (str)" },
      { name: "Gloves (dex)", modKey: "Gloves (dex)" },
      { name: "Gloves (int)", modKey: "Gloves (int)" },
      { name: "Gloves (str / dex)", modKey: "Gloves (str, dex)" },
      { name: "Gloves (str / int)", modKey: "Gloves (str, int)" },
      { name: "Gloves (dex / int)", modKey: "Gloves (dex, int)" },
    ],
  },
  {
    name: "Boots",
    itemType: [
      { name: "Boots (str)", modKey: "Boots (str)" },
      { name: "Boots (dex)", modKey: "Boots (dex)" },
      { name: "Boots (int)", modKey: "Boots (int)" },
      { name: "Boots (str / dex)", modKey: "Boots (str, dex)" },
      { name: "Boots (str / int)", modKey: "Boots (str, int)" },
      { name: "Boots (dex / int)", modKey: "Boots (dex, int)" },
    ],
  },
  {
    name: "Helmets",
    itemType: [
      { name: "Helmets (str)", modKey: "Helmets (str)" },
      { name: "Helmets (dex)", modKey: "Helmets (dex)" },
      { name: "Helmets (int)", modKey: "Helmets (int)" },
      { name: "Helmets (str / dex)", modKey: "Helmets (str, dex)" },
      { name: "Helmets (str / int)", modKey: "Helmets (str, int)" },
      { name: "Helmets (dex / int)", modKey: "Helmets (dex, int)" },
    ],
  },
  {
    name: "Body Armours",
    itemType: [
      { name: "Body Armours (str)", modKey: "Body Armours (str)" },
      { name: "Body Armours (dex)", modKey: "Body Armours (dex)" },
      { name: "Body Armours (int)", modKey: "Body Armours (int)" },
      { name: "Body Armours (str / dex)", modKey: "Body Armours (str, dex)" },
      { name: "Body Armours (str / int)", modKey: "Body Armours (str, int)" },
      { name: "Body Armours (dex / int)", modKey: "Body Armours (dex, int)" },
    ],
  },
  {
    name: "Flasks",
    itemType: [{ name: "Tinctures", modKey: "Tinctures" }],
  },
];

export interface SavedSettings {
  language: RepoeLanguageKey;
  name: string;
  version: number;
  beast: BeastSettings;
  heist: HeistSettings;
  flask: FlaskSettings;
  expedition: ExpeditionSettings;
  map: MapSettings;
  boat: BoatSettings;
  item: ItemSettings;
  vendor: VendorSettings;
  mapNames: MapNameSettings;
  scarab: ScarabSettings;
  jewel: JewelSettings;
  itemCrafting: ItemCraftingSettings;
  tattoo: TattooSettings;
  runegraft: RunegraftSettings;
}

export interface BeastSettings {
  includeHarvest: boolean;
  minChaosValue: string;
  maxChaosValue: string;
  menagerieLimit: boolean;
  redBeastsOnly: boolean;
}

export interface HeistSettings {
  targetValue: number;
  requireCoinValue: boolean;
  contractLevels: ContractLevel[];
}

export interface FlaskSettings {
  selectedPrefix: string[];
  selectedSuffix: string[];
  ilevel: string;
  onlyMaxPrefixTierMod: boolean;
  onlyMaxSuffixTierMod: boolean;
  matchBothPrefixAndSuffix: boolean;
  ignoreEffectTiers: boolean;
  matchOpenPrefixSuffix: boolean;
}

export interface ExpeditionSettings {
  selectedBaseTypes: string[];
  addFillerItems: boolean;
  minValueToDisplay: number;
  minAddValue: number;
}

export interface ItemSettings {
  synthItem: boolean;
  matchAnyAffix: boolean;
  matchOpenAffix: boolean;
  category: ItemCategory;
  itemType: MagicItemType;
  selected: SelectedMod[];
  customText: {
    value: string;
    enabled: boolean;
  };
}

export interface ItemCraftingSettings {
  itembase: Itembase | undefined;
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

export interface MapSettings {
  badIds: number[];
  goodIds: number[];
  allGoodMods: boolean;
  quantity: string;
  packsize: string;
  itemRarity: string;
  currency: string;
  scarab: string;
  optimizeQuant: boolean;
  optimizePacksize: boolean;
  optimizeQuality: boolean;
  displayNightmareMods: boolean;
  displayAffixBadges: boolean;
  groupByAffix: boolean;
  tradeEightModOnly: boolean;
  tradeExcludeValdo: boolean;
  tradeExcludeShaperElder: boolean;
  asyncPriceRange: {
    min: string;
    max: string;
    currency: "chaos" | "divine";
    enabled: boolean;
    tradeEnabled: boolean;
  };
  rarity: {
    normal: boolean;
    magic: boolean;
    rare: boolean;
    include: boolean;
  };
  corrupted: {
    enabled: boolean;
    include: boolean;
  };
  unidentified: {
    enabled: boolean;
    include: boolean;
  };
  quality: {
    regular: string;
    currency: string;
    divination: string;
    rarity: string;
    packSize: string;
    scarab: string;
  };
  anyQuality: boolean;
  anyYield: boolean;
  customText: {
    value: string;
    enabled: boolean;
  };
  mapDropChance: string;
}

export interface MapT17Settings {
  mods: string[];
  quantity: string;
  packsize: string;
  optimizeQuant: boolean;
  optimizePacksize: boolean;
}

export interface BoatSettings {
  selectedGoodIds: number[];
  allGoodMods: boolean;
  adjacentModifier: {
    enabled: boolean;
    include: boolean;
  };
  selectedAreaRegexes: string[];
}

export interface MapNameSettings {
  selected: string[];
  mapTabSearch: boolean;
}

export interface ScarabSettings {
  selected: string[];
  maxPrice: string;
  minPrice: string;
}

export interface TattooSettings {
  minValue: string;
  maxValue: string;
}

export interface JewelSettings {
  allMatch: boolean;
  magicOnly: boolean;
  abyssJewel: boolean;
  selectedRegular: string[];
  selectedAbyss: string[];
  matchBothPrefixAndSuffix: boolean;
  matchOpenPrefixSuffix: boolean;
}

export interface VendorSettings {
  anyTwoLink: boolean;
  anyThreeLink: boolean;
  anyFourLink: boolean;
  anyFiveLink: boolean;
  anySixLink: boolean;
  anyTwoColorLink: boolean
  anyThreeColorLink: boolean
  anyFourColorLink: boolean
  anyFiveColorLink: boolean
  anySixColorLink: boolean
  anySixSocket: boolean;
  movement: {
    ten: boolean;
    fifteen: boolean;
  };
  colors: {
    rrr: boolean;
    ggg: boolean;
    bbb: boolean;

    rrA: boolean;
    ggA: boolean;
    bbA: boolean;

    ggr: boolean;
    ggb: boolean;
    rrg: boolean;
    rrb: boolean;
    bbg: boolean;
    bbr: boolean;

    rgb: boolean;

    raa: boolean;
    gaa: boolean;
    baa: boolean;

    rr: boolean;
    gg: boolean;
    bb: boolean;

    rb: boolean;
    gr: boolean;
    bg: boolean;

    specLink: boolean;
    specLinkColors: {
      r: number | undefined;
      g: number | undefined;
      b: number | undefined;
    };
  };
  plusGems: {
    lightning: boolean;
    fire: boolean;
    cold: boolean;
    phys: boolean;
    chaos: boolean;
    any: boolean;
  };
  damage: {
    phys: boolean;
    firemult: boolean;
    coldmult: boolean;
    chaosmult: boolean;
  };
  weapon: {
    sceptre: boolean;
    mace: boolean;
    axe: boolean;
    sword: boolean;
    bow: boolean;
    claw: boolean;
    dagger: boolean;
    staff: boolean;
    wand: boolean;
    shield: boolean;
  };
  gems: number[];
}

export const defaultSettings: SavedSettings = {
  language: "ENGLISH",
  name: "default",
  version: 1,
  beast: {
    includeHarvest: true,
    minChaosValue: "",
    maxChaosValue: "",
    menagerieLimit: true,
    redBeastsOnly: true,
  },
  heist: {
    targetValue: 0,
    requireCoinValue: false,
    contractLevels: Object.keys(heistContractTypes)
      .map((key) => heistContractTypes[key])
      .map((type) => ({ start: 0, end: 0, type })),
  },
  flask: {
    selectedPrefix: [],
    selectedSuffix: [],
    ilevel: "85",
    onlyMaxPrefixTierMod: false,
    onlyMaxSuffixTierMod: false,
    matchBothPrefixAndSuffix: true,
    ignoreEffectTiers: false,
    matchOpenPrefixSuffix: true,
  },
  expedition: {
    selectedBaseTypes: [],
    addFillerItems: true,
    minValueToDisplay: 90,
    minAddValue: 90,
  },
  item: {
    synthItem: false,
    matchAnyAffix: false,
    matchOpenAffix: true,
    category: categories[0],
    itemType: categories[0].itemType[0],
    selected: [],
    customText: {
      value: "",
      enabled: true,
    },
  },
  map: {
    goodIds: [],
    badIds: [],
    allGoodMods: true,
    quantity: "",
    packsize: "",
    itemRarity: "",
    currency: "",
    scarab: "",
    optimizeQuant: false,
    optimizePacksize: false,
    optimizeQuality: false,
    displayNightmareMods: true,
    displayAffixBadges: false,
    groupByAffix: false,
    tradeEightModOnly: false,
    tradeExcludeValdo: true,
    tradeExcludeShaperElder: true,
    asyncPriceRange: {
      min: "0",
      max: "999",
      currency: "chaos",
      enabled: true,
      tradeEnabled: true,
    },
    rarity: {
      normal: true,
      magic: true,
      rare: true,
      include: true,
    },
    corrupted: {
      enabled: false,
      include: true,
    },
    unidentified: {
      enabled: false,
      include: false,
    },
    quality: {
      regular: "",
      currency: "",
      divination: "",
      rarity: "",
      packSize: "",
      scarab: "",
    },
    anyQuality: true,
    anyYield: false,
    customText: {
      value: "",
      enabled: true,
    },
    mapDropChance: "",
  },
  boat: {
    selectedGoodIds: [],
    allGoodMods: false,
    adjacentModifier: {
      enabled: false,
      include: true,
    },
    selectedAreaRegexes: [],
  },
  mapNames: {
    selected: [],
    mapTabSearch: false,
  },
  vendor: {
    anyTwoLink: false,
    anyThreeLink: false,
    anyFourLink: false,
    anyFiveLink: false,
    anySixLink: false,
    anyTwoColorLink: false,
    anyThreeColorLink: false,
    anyFourColorLink: false,
    anyFiveColorLink: false,
    anySixColorLink: false,
    anySixSocket: false,
    movement: {
      ten: false,
      fifteen: false,
    },
    colors: {
      rrr: false,
      ggg: false,
      bbb: false,

      rrA: false,
      ggA: false,
      bbA: false,

      ggr: false,
      ggb: false,
      rrg: false,
      rrb: false,
      bbg: false,
      bbr: false,

      rgb: false,

      raa: false,
      gaa: false,
      baa: false,

      rr: false,
      gg: false,
      bb: false,

      rb: false,
      gr: false,
      bg: false,

      specLink: false,
      specLinkColors: {
        r: undefined,
        g: undefined,
        b: undefined,
      },
    },
    plusGems: {
      lightning: false,
      fire: false,
      cold: false,
      phys: false,
      chaos: false,
      any: false,
    },
    damage: {
      phys: false,
      firemult: false,
      coldmult: false,
      chaosmult: false,
    },
    weapon: {
      sceptre: false,
      mace: false,
      axe: false,
      sword: false,
      bow: false,
      claw: false,
      dagger: false,
      staff: false,
      wand: false,
      shield: false,
    },
    gems: [],
  },
  scarab: {
    selected: [],
    maxPrice: "0.81",
    minPrice: "0.00",
  },
  jewel: {
    allMatch: false,
    magicOnly: true,
    abyssJewel: false,
    matchBothPrefixAndSuffix: true,
    matchOpenPrefixSuffix: true,
    selectedRegular: [],
    selectedAbyss: [],
  },
  itemCrafting: {
    itembase: undefined,
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
  },
  tattoo: {
    minValue: "",
    maxValue: "",
  },
  runegraft: {
    minValue: "",
    maxValue: "",
    includeTattoos: false,
  },
};

export interface RunegraftSettings {
  minValue: string;
  maxValue: string;
  includeTattoos: boolean;
}
