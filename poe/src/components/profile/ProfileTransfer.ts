import {merge} from "@shared/core/utils";
import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";

export const encodeProfile = (settings: SavedSettings): string => {
  const minimalSettings: Record<string, unknown> = {
    // Identity fields must survive even when exporting the default profile.
    name: settings.name,
    language: settings.language,
    version: settings.version,
  };

  (Object.keys(settings) as Array<keyof SavedSettings>).forEach((key) => {
    if (key === "name" || key === "language" || key === "version") return;

    const currentVal = settings[key];
    const defaultVal = defaultSettings[key];

    if (typeof currentVal === "object" && currentVal !== null && !Array.isArray(currentVal)) {
      const nestedDeltas: Record<string, unknown> = {};
      Object.keys(currentVal).forEach((nestedKey) => {
        const nestedCurrent = (currentVal as unknown as Record<string, unknown>)[nestedKey];
        const nestedDefault = (defaultVal as unknown as Record<string, unknown> | undefined)?.[nestedKey];
        if (JSON.stringify(nestedCurrent) !== JSON.stringify(nestedDefault)) {
          nestedDeltas[nestedKey] = nestedCurrent;
        }
      });
      if (Object.keys(nestedDeltas).length > 0) minimalSettings[key] = nestedDeltas;
    } else if (JSON.stringify(currentVal) !== JSON.stringify(defaultVal)) {
      minimalSettings[key] = currentVal;
    }
  });

  return btoa(unescape(encodeURIComponent(JSON.stringify(minimalSettings))));
};

export const decodeProfile = (value: string): SavedSettings => {
  const jsonString = decodeURIComponent(escape(atob(value.trim())));
  const parsed: unknown = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Profile payload must be an object");
  }

  // Exports contain only deviations from the defaults. Hydrate them before saving.
  // This also keeps old default-profile exports (which omitted their name) importable.
  const profile = merge(defaultSettings, parsed as Partial<SavedSettings>);
  if (typeof profile.name !== "string" || !profile.name.trim()) {
    throw new Error("Profile name is missing");
  }
  return profile;
};
