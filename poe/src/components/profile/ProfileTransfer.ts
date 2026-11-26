import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";
import {createProfileDelta, hydrateProfileDelta} from "@shared/components/profile/ProfileDelta";
import {decodeProfilePayload} from "@shared/components/profile/ProfileGame";
import {parseFavoriteRecords} from "@poe/core/favorites/FavoriteTypes";
import {profileVersion} from "@shared/migration/ProfileMigrations";

interface PoeProfilePayload {
  game: "poe";
  settings: Partial<SavedSettings>;
}

/** The settings that differ from the defaults, with the name, language and version. */
export const exportSettings = (settings: SavedSettings): Partial<SavedSettings> => {
  const transferableSettings = {...settings, favorites: parseFavoriteRecords(settings.favorites)};
  const minimalSettings = (createProfileDelta(transferableSettings, defaultSettings) ?? {}) as Partial<SavedSettings>;
  minimalSettings.name = settings.name;
  minimalSettings.language = settings.language;
  minimalSettings.version = settings.version;
  return minimalSettings;
};

export const encodeProfile = (settings: SavedSettings): string => {
  const payload: PoeProfilePayload = {game: "poe", settings: exportSettings(settings)};
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

  // Unwrapped exports are supported for backwards compatibility.
  return readProfile(settings);
};

/** Fills a profile's exported settings in from the defaults. Throws when they are not a profile. */
export const readProfile = (settings: unknown): SavedSettings => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("Profile settings are missing");
  const profile = hydrateProfileDelta(settings, defaultSettings) as SavedSettings;
  if (typeof profile.name !== "string" || !profile.name.trim()) {
    throw new Error("Profile name is missing");
  }
  profile.favorites = parseFavoriteRecords(profile.favorites);
  // Exports without a version are migrated on import
  profile.version = profileVersion(settings);
  return profile;
};
