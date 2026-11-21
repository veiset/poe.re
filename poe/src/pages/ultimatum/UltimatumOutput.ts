import type {UltimatumSettings} from "@poe/utils/SavedSettings";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";

/**
 * A unique reward names a random unique item, so it has no text to search for. Its id in the selected rewards
 * finds it as the reward that's none of the other, fixed, rewards.
 */
export const uniqueRewardId = "UniqueItem";

const regexes = (entries: {id: string, regex: string}[], ids: string[]) =>
  entries.filter((entry) => ids.includes(entry.id)).map((entry) => entry.regex);

/** With a unique reward, the sacrifices can't be searched: it excludes rewards, and they'd have to be matched. */
export const ignoresSacrifices = (settings: UltimatumSettings) =>
  settings.rewards.includes(uniqueRewardId) && settings.sacrifices.length > 0;

/**
 * Excludes the modifiers to avoid, and matches any of the wanted rewards and sacrifices: `"!^ov|^ruin$" "ne or|: it"`.
 * With a unique reward, it excludes the fixed rewards that aren't wanted instead: `"!^ov|iced d|ced c"`.
 */
export const generateUltimatumRegex = (settings: UltimatumSettings, data?: Ultimatum): string => {
  if (!data) return "";
  const avoid = regexes(data.modifiers, settings.avoidModifiers);
  if (settings.rewards.includes(uniqueRewardId)) {
    const unwanted = data.rewards.filter((reward) => !settings.rewards.includes(reward.id)).map((reward) => reward.regex);
    const excluded = [...avoid, ...unwanted];
    return excluded.length > 0 ? `"!${excluded.join("|")}"` : "";
  }
  const want = [...regexes(data.rewards, settings.rewards), ...regexes(data.sacrifices, settings.sacrifices)];
  return [
    avoid.length > 0 ? `"!${avoid.join("|")}"` : "",
    want.length > 0 ? `"${want.join("|")}"` : "",
  ].filter(Boolean).join(" ");
};
