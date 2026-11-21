import type {UltimatumSettings} from "@poe/utils/SavedSettings";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";

const regexes = (entries: {id: string, regex: string}[], ids: string[]) =>
  entries.filter((entry) => ids.includes(entry.id)).map((entry) => entry.regex);

/** Excludes the modifiers to avoid, and matches any of the wanted rewards and sacrifices: `"!^ov|^ruin$" "ne or|: it"`. */
export const generateUltimatumRegex = (settings: UltimatumSettings, data?: Ultimatum): string => {
  if (!data) return "";
  const avoid = regexes(data.modifiers, settings.avoidModifiers);
  const want = [...regexes(data.rewards, settings.rewards), ...regexes(data.sacrifices, settings.sacrifices)];
  return [
    avoid.length > 0 ? `"!${avoid.join("|")}"` : "",
    want.length > 0 ? `"${want.join("|")}"` : "",
  ].filter(Boolean).join(" ");
};
