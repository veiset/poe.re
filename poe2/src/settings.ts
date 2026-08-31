import {Itembase, ItemModifier} from "./types/generated/ItemTypedef";
import {AsyncTradePriceRangeValue} from "@shared/components/AsyncTradePriceRange/AsyncTradePriceRange";

export type Poe2FavoritePageKey = "vendor" | "waystone" | "tablet" | "relic" | "item";

export interface Poe2FavoriteRecord {
  schemaVersion: 1;
  id: string;
  pageKey: Poe2FavoritePageKey;
  name: string;
  description: string;
  color: string;
  icon?: string;
  tags: string[];
  regex: string;
  configuration: unknown;
  context: {league?: string};
  createdAt: string;
  updatedAt: string;
}

export interface SelectOption {
  name: string
  value: number | null
  isSelected: boolean
  ranges: number[][]
  regex: string
  id?: number
}

export interface WebSettings {
  sidebarOpen: boolean
  optionsOpen: boolean
  poe2League: string
}

export const defaultWebSettings: WebSettings = {
  sidebarOpen: true,
  optionsOpen: false,
  poe2League: "",
}

export interface ResultSettings {
  customText: string,
  autoCopy: boolean,
  customTextEnabled: boolean,
}

export enum GroupCondition {
  AND = "AND",
  OR = "OR",
}

export interface VendorGroup {
  condition: GroupCondition,
  itemType: {
    rare: boolean,
    magic: boolean,
    normal: boolean,
  }
  itemProperty: {
    quality: boolean,
    sockets: boolean,
  },
  movementSpeed: {
    move30: boolean,
    move25: boolean,
    move20: boolean,
    move15: boolean,
    move10: boolean,
  },
  itemMods: {
    physical: boolean,
    spellDamage: boolean,
    elemental: boolean,
    fireDamage: boolean,
    coldDamage: boolean,
    lightningDamage: boolean,
    chaosDamage: boolean,
    skillLevel: boolean,
    skillLevelMinion: boolean,
    skillLevelMelee: boolean,
    skillLevelSpell: boolean,
    skillLevelFire: boolean,
    skillLevelCold: boolean,
    skillLevelLightning: boolean,
    skillLevelChaos: boolean,
    skillLevelPhysical: boolean,
    skillLevelProjectile: boolean,
    spirit: boolean,
    rarity: boolean,
    attackSpeed: boolean,
    castSpeed: boolean,
    maxLife: boolean,
    maxMana: boolean,
    strength: boolean,
    intelligence: boolean,
    dexterity: boolean,
  },
  resistances: {
    fire: boolean,
    cold: boolean,
    lightning: boolean,
    chaos: boolean,
  },
  itemClass: {
    amulets: boolean,
    rings: boolean,
    belts: boolean,

    daggers: boolean,
    wands: boolean,
    oneHandMaces: boolean,
    sceptres: boolean,

    bows: boolean,
    staves: boolean,
    twoHandMaces: boolean,
    quarterstaves: boolean,
    spears: boolean,
    crossbows: boolean,
    talisman: boolean,

    gloves: boolean,
    boots: boolean,
    bodyArmours: boolean,
    helmets: boolean,
    quivers: boolean,
    foci: boolean,
    shields: boolean,
    bucklers: boolean,
  },
  itemLevel: {
    min: string,
    max: string,
  },
  characterLevel: {
    min: string,
    max: string,
  }
}

export interface ItemSettings {
  itemBase: Itembase | undefined,
  selectedMods: SelectedItemMod[],
  rareSettings: {
    matchAnyMod: boolean
  },
  resultSettings: ResultSettings
}

export interface SelectedItemMod {
  basetype: string
  category: string
  itemModifier: ItemModifier
  values: {
    [key: number]: string;
  };
  selected: boolean
}

type RelicSettings = {
  resultSettings: ResultSettings,
  matchType: string,
  modifier: {
    prefixes: SelectOption[],
    suffixes: SelectOption[],
  }
};

type TabletSettings = {
  resultSettings: ResultSettings,
  rarity: {
    normal: boolean,
    magic: boolean,
    rare: boolean,
  },
  type: {
    irradiated: boolean,
    ritual: boolean,
    delirium: boolean,
    breach: boolean,
    abyss: boolean,
    temple: boolean,
    overseer: boolean,
  },
  modifier: {
    usesRemaining: boolean,
    numUsesRemaining: number,
    round10: boolean,
    affixSelectType: string,
    affixes: SelectOption[],
  },
  asyncPriceRange: AsyncTradePriceRangeValue<"exalted" | "divine">,
};

type WaystoneSettings = {
  resultSettings: ResultSettings,
  tier: {
    min: number,
    max: number,
  },
  revives: {
    min: number,
    max: number,
  },
  state: {
    corrupted: boolean,
    uncorrupted: boolean,
    delirious: boolean,
  },
  modifier: {
    round10: boolean,
    wantedModsSelectType: string,
    wantedMods: SelectOption[],
    unwantedMods: SelectOption[],
  },
  itemRarity: string,
  waystoneDropChance: string,
  monsterEffectiveness: string,
  monsterRarity: string,
  packSize: string,
  rarity: {
    normal: boolean,
    magic: boolean,
    rare: boolean,
  },
  asyncPriceRange: AsyncTradePriceRangeValue<"exalted" | "divine">,
};

type VendorSettings = {
  selectedGroupId: number
  resultSettings: ResultSettings,
  vendorGroups: VendorGroup[],
};

export interface Settings {
  name: string
  favorites: Poe2FavoriteRecord[]
  vendor: VendorSettings
  waystone: WaystoneSettings,
  tablet: TabletSettings,
  relic: RelicSettings,
  item: ItemSettings,
}

const defaultResultSettings: ResultSettings = ({
  customText: "",
  autoCopy: false,
  customTextEnabled: false,
})

export const defaultEmptyVendor = {
  resultSettings: defaultResultSettings,
  condition: GroupCondition.OR,
  itemType: {
    rare: false,
    magic: false,
    normal: false,
  },
  itemProperty: {
    quality: false,
    sockets: false,
  },
  movementSpeed: {
    move30: false,
    move25: false,
    move20: false,
    move15: false,
    move10: false,
  },
  itemMods: {
    physical: false,
    spellDamage: false,
    elemental: false,
    skillLevel: false,
    skillLevelMinion: false,
    skillLevelMelee: false,
    skillLevelSpell: false,
    skillLevelFire: false,
    skillLevelCold: false,
    skillLevelLightning: false,
    skillLevelChaos: false,
    skillLevelPhysical: false,
    skillLevelProjectile: false,
    spirit: false,
    rarity: false,
    fireDamage: false,
    coldDamage: false,
    lightningDamage: false,
    chaosDamage: false,
    attackSpeed: false,
    castSpeed: false,
    maxLife: false,
    maxMana: false,
    strength: false,
    intelligence: false,
    dexterity: false,
  },
  resistances: {
    fire: false,
    cold: false,
    lightning: false,
    chaos: false,
  },
  itemClass: {
    amulets: false,
    rings: false,
    belts: false,

    daggers: false,
    wands: false,
    oneHandMaces: false,
    sceptres: false,

    bows: false,
    staves: false,
    twoHandMaces: false,
    quarterstaves: false,
    spears: false,
    crossbows: false,
    talisman: false,

    gloves: false,
    boots: false,
    bodyArmours: false,
    helmets: false,
    quivers: false,
    foci: false,
    shields: false,
    bucklers: false,
  },
  itemLevel: {
    min: "",
    max: "",
  },
  characterLevel: {
    min: "",
    max: "",
  }
};
export const defaultSettings: Settings = {
  name: "default",
  favorites: [],
  vendor: {
    resultSettings: defaultResultSettings,
    selectedGroupId: 0,
    vendorGroups: [{...defaultEmptyVendor}],
  },
  waystone: {
    resultSettings: defaultResultSettings,
    tier: {
      min: 1,
      max: 16,
    },
    revives: {
      min: 0,
      max: 6,
    },
    state: {
      corrupted: false,
      uncorrupted: false,
      delirious: false,
    },
    modifier: {
      round10: false,
      wantedModsSelectType: "any",
      wantedMods: [],
      unwantedMods: [],
    },
    itemRarity: "",
    waystoneDropChance: "",
    monsterEffectiveness: "",
    monsterRarity: "",
    packSize: "",
    rarity: {
      normal: false,
      magic: false,
      rare: false,
    },
    asyncPriceRange: {
      min: "0",
      max: "999",
      currency: "exalted",
      enabled: false,
      tradeEnabled: false,
    },
  },
  tablet: {
    resultSettings: defaultResultSettings,
    rarity: {
      normal: false,
      magic: false,
      rare: false,
    },
    type: {
      irradiated: false,
      ritual: false,
      delirium: false,
      breach: false,
      abyss: false,
      temple: false,
      overseer: false,
    },
    modifier: {
      usesRemaining: false,
      numUsesRemaining: 10,
      round10: false,
      affixSelectType: "any",
      affixes: [],
    },
    asyncPriceRange: {
      min: "0",
      max: "999",
      currency: "exalted",
      enabled: false,
      tradeEnabled: false,
    },
  },
  relic: {
    resultSettings: defaultResultSettings,
    matchType: "any",
    modifier: {
      prefixes: [],
      suffixes: [],
    }
  },
  item: {
    itemBase: undefined,
    selectedMods: [],
    rareSettings: {
      matchAnyMod: true
    },
    resultSettings: defaultResultSettings,
  }
}
