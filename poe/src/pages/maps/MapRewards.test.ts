import {describe, expect, it} from "vitest";
import type {MapReward} from "@shared/typedefs/poe1/MapMods";
import {mapRewardText} from "./MapRewards";

// 3.30.0.4, Generated.Map.ENGLISH: "Monsters have +50% Chance to Block Attack Damage|..." (id -1940135977)
const blockRewards: MapReward[] = [{type: "Rarity", value: 8}, {type: "Atlas", value: 13}, {type: "Currency", value: 47}];

describe("mapRewardText", () => {
  it("says what each of a Nightmare mod's rewards gives", () => {
    expect(blockRewards.map(mapRewardText)).toEqual([
      "+8% increased Item Rarity",
      "+13% Atlas Drops",
      "47% more Currency found in Area",
    ]);
  });

  it("names Maps and Threads rewards", () => {
    expect(mapRewardText({type: "Maps", value: 35})).toBe("35% more Maps found in Area");
    expect(mapRewardText({type: "Threads", value: 60})).toBe("60% more Threads found in Area");
  });

  it("shows a type it doesn't know as it is", () => {
    expect(mapRewardText({type: "Gold", value: 20})).toBe("20% Gold");
  });
});
