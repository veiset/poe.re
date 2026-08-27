import {defaultSettings, Settings} from "../settings";
import {createProfileDelta, hydrateProfileDelta} from "@shared/components/profile/ProfileDelta";
import {decodeProfilePayload} from "@shared/components/profile/ProfileGame";

interface Poe2ProfilePayload {
  game: "poe2";
  settings: Partial<Settings>;
}

export const encodeProfile = (settings: Settings): string => {
  const deltas = (createProfileDelta(settings, defaultSettings) ?? {}) as Partial<Settings>;
  deltas.name = settings.name;

  const payload: Poe2ProfilePayload = {
    game: "poe2",
    settings: deltas,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
};

export const decodeProfile = (value: string): Settings => {
  const parsed = decodeProfilePayload(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Profile payload must be an object");
  }

  const payload = parsed as Partial<Poe2ProfilePayload>;
  if (payload.game !== "poe2" || !payload.settings || typeof payload.settings !== "object") {
    throw new Error("This is not a PoE2 profile export");
  }

  // hydrate also accepts the original full-object/array payload format.
  const profile = hydrateProfileDelta(payload.settings, defaultSettings) as Settings;
  if (typeof profile.name !== "string" || !profile.name.trim()) {
    throw new Error("Profile name is missing");
  }
  return profile;
};
