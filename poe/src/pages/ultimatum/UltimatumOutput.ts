import type {UltimatumSettings} from "@poe/utils/SavedSettings";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";

/**
 * A unique reward names a random unique item, so it has no text to search for. Its id in the selected rewards
 * finds it as the reward that's none of the other, fixed, rewards.
 */
export const uniqueRewardId = "UniqueItem";

const regexes = (entries: {id: string, regex: string}[], ids: string[]) =>
  entries.filter((entry) => ids.includes(entry.id)).map((entry) => entry.regex);

/** The selected rewards that the selected sacrifices give, e.g. "Doubles sacrificed Currency" for a Divine Orb. */
const rewardsOfSelectedSacrifices = (settings: UltimatumSettings, data: Ultimatum) => {
  const sacrifices = data.sacrifices.filter((sacrifice) => settings.sacrifices.includes(sacrifice.id));
  return data.rewards.filter((reward) =>
    settings.rewards.includes(reward.id) && sacrifices.some((sacrifice) => sacrifice.reward === reward.reward));
};

/** A selected reward that the selected sacrifices give is only matched for those sacrifices, not for any sacrifice. */
export const sacrificesNarrowReward = (settings: UltimatumSettings, data?: Ultimatum): string | undefined => {
  const rewards = data ? rewardsOfSelectedSacrifices(settings, data) : [];
  return rewards.length > 0
    ? `${rewards.map((reward) => reward.reward).join(", ")}: only the selected sacrifices are matched.`
    : undefined;
};

/**
 * With a unique reward, the item can only be found by what it doesn't show, so this excludes the fixed rewards that
 * aren't wanted and, when sacrifices are selected, the other sacrifices. A selected sacrifice wants its reward.
 */
const excludedForUniqueReward = (settings: UltimatumSettings, data: Ultimatum): string[] => {
  const sacrifices = data.sacrifices.filter((sacrifice) => settings.sacrifices.includes(sacrifice.id));
  const wantedRewards = data.rewards.filter((reward) =>
    settings.rewards.includes(reward.id) || sacrifices.some((sacrifice) => sacrifice.reward === reward.reward));
  const otherSacrifices = sacrifices.length > 0 ? data.sacrifices.filter((sacrifice) => !sacrifices.includes(sacrifice)) : [];
  return [
    ...data.rewards.filter((reward) => !wantedRewards.includes(reward)),
    ...otherSacrifices,
  ].map((entry) => entry.regex);
};

/**
 * Excludes the modifiers to avoid, and matches any of the wanted rewards and sacrifices: `"!^ov|^ruin$" "ne or|: it"`.
 * With a unique reward, it excludes the rewards and sacrifices that aren't wanted instead: `"!^ov|iced d|: it|ced c"`.
 */
export const generateUltimatumRegex = (settings: UltimatumSettings, data?: Ultimatum): string => {
  if (!data) return "";
  const avoid = regexes(data.modifiers, settings.avoidModifiers);
  if (settings.rewards.includes(uniqueRewardId)) {
    const excluded = [...avoid, ...excludedForUniqueReward(settings, data)];
    return excluded.length > 0 ? `"!${excluded.join("|")}"` : "";
  }
  const narrowed = rewardsOfSelectedSacrifices(settings, data);
  const rewards = data.rewards.filter((reward) => settings.rewards.includes(reward.id) && !narrowed.includes(reward));
  const want = [...rewards.map((reward) => reward.regex), ...regexes(data.sacrifices, settings.sacrifices)];
  return [
    avoid.length > 0 ? `"!${avoid.join("|")}"` : "",
    want.length > 0 ? `"${want.join("|")}"` : "",
  ].filter(Boolean).join(" ");
};
