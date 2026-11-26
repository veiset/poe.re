import {count} from "@shared/components/share/ShareConfig";
import type {ShareConfig} from "@shared/components/share/ShareConfig";
import {exportSettings, readProfile} from "../../components/ProfileTransfer";
import {migrateProfile} from "../../migration/migrations";
import {loadProfileNames, saveSettings} from "../../localStorage";
import {defaultSettings} from "../../settings";
import type {SelectOption, Settings} from "../../settings";

const selected = (...options: SelectOption[][]) => options.flat().filter((option) => option.isSelected).length;

/** How poe2.re shares profiles: what the share dialog and the share page need to know about its settings. */
export const poe2Share: ShareConfig<Settings> = {
  game: "poe2",
  site: "poe2.re",
  storagePrefix: "poe2.",
  defaultSettings,
  sections: [
    {key: "favorites", label: "Favorites", info: ({favorites}) => [count(favorites.length, "favorite")]},
    {key: "vendor", label: "Vendor"},
    {key: "waystone", label: "Waystones", info: ({waystone}) => [
      count(selected(waystone.modifier.wantedMods, waystone.modifier.unwantedMods), "mod"),
      (waystone.tier.min !== defaultSettings.waystone.tier.min || waystone.tier.max !== defaultSettings.waystone.tier.max)
        && `tier ${waystone.tier.min}-${waystone.tier.max}`,
    ]},
    {key: "tablet", label: "Tablets", info: ({tablet}) => [count(selected(tablet.modifier.affixes), "mod")]},
    {key: "relic", label: "Relics", info: ({relic}) => [
      count(selected(relic.modifier.prefixes, relic.modifier.suffixes), "mod"),
    ]},
    {key: "itemCrafting", label: "Items", info: ({itemCrafting}) => [
      count(Object.keys(itemCrafting.selectedRareMods).length + itemCrafting.selectedMagicMods.length, "mod"),
    ]},
  ],
  keep: ["language", "version"],
  landingPages: [
    ["waystone", "/waystone"], ["tablet", "/tablet"], ["relic", "/relic"], ["itemCrafting", "/item"], ["vendor", "/vendor"],
  ],
  fallbackPage: "/favorites",
  exportSettings,
  readProfile,
  migrateProfile,
  profileNames: loadProfileNames,
  // Also selects it
  saveProfile: saveSettings,
};
