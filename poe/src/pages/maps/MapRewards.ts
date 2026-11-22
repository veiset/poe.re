import type {MapReward} from "@shared/typedefs/poe1/MapMods";

/**
 * What a Nightmare mod's reward gives, by its type. The value is the stat's percent (poe-item-gen's
 * MapModV3Generator): Rarity and Atlas Drops are increased, the others are `_final` stats, so more.
 */
const REWARD_TEXT: Record<string, (value: number) => string> = {
  Atlas: (v) => `+${v}% Atlas Drops`,
  Rarity: (v) => `+${v}% increased Item Rarity`,
  Maps: (v) => `${v}% more Maps found in Area`,
  Currency: (v) => `${v}% more Currency found in Area`,
  Threads: (v) => `${v}% more Threads found in Area`,
};

/** A reward's hover text, e.g. "+13% Atlas Drops". An unknown type shows as "<value>% <type>". */
export const mapRewardText = (reward: MapReward): string =>
  REWARD_TEXT[reward.type]?.(reward.value) ?? `${reward.value}% ${reward.type}`;
