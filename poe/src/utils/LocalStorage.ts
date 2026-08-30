import {defaultSettings, SavedSettings} from "./SavedSettings";
import {merge, safeLoad} from "@shared/core/utils";

interface SavedProfiles {
  [key: string]: SavedSettings
}

export const loadProfiles = (): SavedProfiles => {
  return safeLoad("profiles");
}

export const loadProfileNames = (): string[] => {
  return Object.keys(loadProfiles());
}

export const deleteProfile = (profile: string): void => {
  const profiles = loadProfiles();
  delete profiles[profile];
  localStorage.setItem("profiles", JSON.stringify(profiles));
}
export const loadSettings = (profile: string): SavedSettings => {
  const settings = loadProfiles()[profile] ?? {};
  const hydrated = merge(defaultSettings, settings);
  hydrated.version = Math.max(Number(hydrated.version) || 1, defaultSettings.version);
  hydrated.favorites = Array.isArray(hydrated.favorites) ? hydrated.favorites : [];
  return hydrated;
}

export const selectedProfile = (): string =>
  localStorage.getItem("selectedProfile") ?? "default";

export const setSelectedProfile = (name: string): void => {
  localStorage.setItem("selectedProfile", name);
}

export const saveSettings = (settings: SavedSettings): void => {
  localStorage.setItem("selectedProfile", settings.name);
  const profiles = loadProfiles();
  profiles[settings.name] = settings;
  localStorage.setItem("profiles", JSON.stringify(profiles));
}

/** Atomically updates one profile from its latest persisted value. */
export const updateSettings = (profileName: string, updater: (settings: SavedSettings) => SavedSettings): SavedSettings => {
  const profiles = loadProfiles();
  const current = merge(defaultSettings, profiles[profileName] ?? {name: profileName});
  current.version = Math.max(Number(current.version) || 1, defaultSettings.version);
  const next = updater(current);
  profiles[profileName] = next;
  localStorage.setItem("profiles", JSON.stringify(profiles));
  return next;
};


export const valueFromKeyMap = (savedSettings: any, key: string): any | undefined => {
  const props = key.split(".");
  let obj = savedSettings;
  for (const prop of props) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, prop)) {
      return undefined;
    }
    obj = obj[prop];
  }
  return obj;
}

export const hasNKey = (savedSettings: any, key: string): boolean => {
  return valueFromKeyMap(savedSettings, key) === true;
}

export const hasNumberKey = (savedSettings: any, key: string): number | undefined => {
  const value = valueFromKeyMap(savedSettings, key);
  const isANumber = !isNaN(Number(value));
  return isANumber ? Number(value) : undefined;
}
