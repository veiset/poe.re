import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";
import {createProfileDelta, hydrateProfileDelta} from "@shared/components/profile/ProfileDelta";
import {parseFavoriteRecords} from "@poe/core/favorites/FavoriteTypes";
import {profileVersion} from "@shared/migration/ProfileMigrations";

/** The settings that differ from the defaults, with the name, language and version. */
export const exportSettings = (settings: SavedSettings): Partial<SavedSettings> => {
  const transferableSettings = {...settings, favorites: parseFavoriteRecords(settings.favorites)};
  const minimalSettings = (createProfileDelta(transferableSettings, defaultSettings) ?? {}) as Partial<SavedSettings>;
  minimalSettings.name = settings.name;
  minimalSettings.language = settings.language;
  minimalSettings.version = settings.version;
  return minimalSettings;
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
