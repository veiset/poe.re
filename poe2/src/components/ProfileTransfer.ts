import {defaultSettings, Settings} from "../settings";
import {createProfileDelta, hydrateProfileDelta} from "@shared/components/profile/ProfileDelta";
import {parseFavorites} from "../favorites";
import {profileVersion} from "@shared/migration/ProfileMigrations";

/** The settings that differ from the defaults, with the name and version. */
export const exportSettings = (settings: Settings): Partial<Settings> => {
  const deltas = (createProfileDelta(settings, defaultSettings) ?? {}) as Partial<Settings>;
  deltas.name = settings.name;
  deltas.version = settings.version;
  return deltas;
};

/** Fills a profile's exported settings in from the defaults. Throws when they are not a profile. */
export const readProfile = (settings: unknown): Settings => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("Profile settings are missing");
  // hydrate also accepts the original full-object payload format.
  const profile = hydrateProfileDelta(settings, defaultSettings) as Settings;
  if (typeof profile.name !== "string" || !profile.name.trim()) {
    throw new Error("Profile name is missing");
  }
  profile.favorites = parseFavorites(profile.favorites);
  // Exports made before profiles had a version are migrated on import
  profile.version = profileVersion(settings);
  return profile;
};
