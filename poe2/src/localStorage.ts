import {defaultSettings, defaultWebSettings, Settings, WebSettings} from "./settings";
import {merge, safeLoad} from "@shared/core/utils";

const PROFILE_KEY = "poe2.profiles";
const SELECTED_PROFILE_KEY = "poe2.selectedProfile";
const WEB_SETTINGS_KEY = "poe2.webSettings";

interface SavedProfiles {
  [key: string]: Settings
}

export const loadProfiles = (): SavedProfiles => {
  return safeLoad(PROFILE_KEY);
}

export const loadWebSettings = (): WebSettings => {
  return {defaultWebSettings, ...safeLoad(WEB_SETTINGS_KEY)}
}

export const saveWebSettings = (settings: WebSettings) => {
  localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(settings));
}

export const loadProfileNames = (): string[] => {
  return Object.keys(loadProfiles());
}

export const deleteProfile = (profile: string): void => {
  const profiles = loadProfiles();
  delete profiles[profile];
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

export const loadSettings = (profile: string): Settings => {
  const settings = loadProfiles()[profile] ?? {};
  return merge(defaultSettings, settings);
}

export const selectedProfile = (): string =>
  localStorage.getItem(SELECTED_PROFILE_KEY) ?? "default";

export const setSelectedProfile = (name: string): void => {
  localStorage.setItem(SELECTED_PROFILE_KEY, name);
}

export const saveSettings = (settings: Settings): void => {
  localStorage.setItem(SELECTED_PROFILE_KEY, settings.name);
  const profiles = loadProfiles();
  profiles[settings.name] = settings;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

export const updateSettings = (profile: string, updater: (settings: Settings) => Settings): Settings => {
  const settings = {...updater(loadSettings(profile)), name: profile};
  saveSettings(settings);
  return settings;
};
