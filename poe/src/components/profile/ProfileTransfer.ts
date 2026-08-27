import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";
import {createProfileDelta, hydrateProfileDelta} from "@shared/components/profile/ProfileDelta";
import {decodeProfilePayload} from "@shared/components/profile/ProfileGame";

interface PoeProfilePayload {
  game: "poe";
  settings: Partial<SavedSettings>;
}

export const encodeProfile = (settings: SavedSettings): string => {
  const minimalSettings = (createProfileDelta(settings, defaultSettings) ?? {}) as Partial<SavedSettings>;
  minimalSettings.name = settings.name;
  minimalSettings.language = settings.language;
  minimalSettings.version = settings.version;

  const payload: PoeProfilePayload = {game: "poe", settings: minimalSettings};
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
};

export const decodeProfile = (value: string): SavedSettings => {
  const parsed = decodeProfilePayload(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Profile payload must be an object");
  }

  const payload = parsed as Partial<PoeProfilePayload>;
  if (payload.game && payload.game !== "poe") throw new Error("This is not a PoE profile export");
  if (!payload.game && "settings" in payload) throw new Error("Profile game is missing");
  const settings = payload.game === "poe" ? payload.settings : parsed;
  if (!settings || typeof settings !== "object") throw new Error("Profile settings are missing");

  // Unwrapped exports are supported for backwards compatibility.
  const profile = hydrateProfileDelta(settings, defaultSettings) as SavedSettings;
  if (typeof profile.name !== "string" || !profile.name.trim()) {
    throw new Error("Profile name is missing");
  }
  return profile;
};
