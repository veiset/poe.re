import {count} from "@shared/components/share/ShareConfig";
import type {ShareConfig} from "@shared/components/share/ShareConfig";
import {exportSettings, readProfile} from "@poe/components/profile/ProfileTransfer";
import {migrateProfile} from "@poe/migration/migrations";
import {loadProfileNames, setSelectedProfile, updateSettings} from "@poe/utils/LocalStorage";
import {defaultSettings} from "@poe/utils/SavedSettings";
import type {SavedSettings} from "@poe/utils/SavedSettings";

/** How poe.re shares profiles: what the share dialog and the share page need to know about its settings. */
export const poeShare: ShareConfig<SavedSettings> = {
  game: "poe",
  site: "poe.re",
  storagePrefix: "",
  defaultSettings,
  // The pages of the site. Settings of removed pages (boat, expedition, scarab, flask, item) are not shared.
  sections: [
    {key: "favorites", label: "Favorites", info: ({favorites}) => [count(favorites.length, "favorite")]},
    {key: "vendor", label: "Vendor"},
    {key: "gems", label: "Gems", info: ({gems}) => [count(gems.selected.length, "gem")]},
    {key: "map", label: "Map mods", info: ({map}) => [
      count(map.goodIds.length + map.badIds.length, "mod"),
      map.quantity && `quantity ${map.quantity}`,
      map.packsize && `pack size ${map.packsize}`,
    ]},
    {key: "itemCrafting", label: "Items", info: ({itemCrafting}) => [
      count(Object.keys(itemCrafting.selectedRareMods).length + itemCrafting.selectedMagicMods.length, "mod"),
    ]},
    {key: "heist", label: "Heist"},
    {key: "beast", label: "Bestiary"},
    {key: "tattoo", label: "Tattoo"},
    {key: "runegraft", label: "Runegraft"},
    {key: "ultimatum", label: "Ultimatum", info: ({ultimatum}) => [
      count(ultimatum.avoidModifiers.length, "avoided modifier"),
      count(ultimatum.rewards.length, "reward"),
      count(ultimatum.sacrifices.length, "sacrifice"),
    ]},
  ],
  keep: ["language", "version"],
  landingPages: [
    ["map", "/maps"], ["itemCrafting", "/items"], ["beast", "/beast"], ["tattoo", "/tattoo"], ["ultimatum", "/ultimatum"],
    ["runegraft", "/runegraft"], ["heist", "/heist"], ["gems", "/gems"], ["vendor", "/vendor"],
  ],
  fallbackPage: "/favorites",
  exportSettings,
  readProfile,
  migrateProfile,
  profileNames: loadProfileNames,
  saveProfile: (profile) => {
    updateSettings(profile.name, () => profile);
    setSelectedProfile(profile.name);
  },
};
