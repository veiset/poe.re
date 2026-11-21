import {describe, expect, it} from "vitest";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";
import {generateUltimatumRegex} from "./UltimatumOutput";

// Entries from generated/ultimatum/Generated.Ultimatum.ENGLISH.json
const data: Ultimatum = {
  modifiers: [
    {id: "ChaosCloudDaemon3", name: "Choking Miasma III", tier: 3, description: "", regex: "a iii"},
    {id: "ChaosCloudDaemon2", name: "Choking Miasma II", tier: 2, description: "", regex: "a ii$"},
    {id: "RevenantDaemon2", name: "Stalking Ruin II", tier: 2, description: "", regex: "g ruin ii$"},
    {id: "MonstersApplyRuin1", name: "Ruin", tier: 1, description: "", regex: "^ruin$"},
    {id: "MonsterOverwhelm", name: "Overwhelming Monsters", tier: 1, description: "", regex: "^ov"},
    {id: "PlayerDebuffCancelFlaskEffectOnFlaskUse", name: "Drought", tier: 1, description: "", regex: "^dr"},
  ],
  rewards: [
    {id: "MirrorRare1", reward: "Item and Mirrored Copy", regex: ": it"},
    {id: "CurrencyChaos5", reward: "Doubles sacrificed Currency", regex: "ced c"},
  ],
  sacrifices: [
    {id: "Metadata/Items/Currency/CurrencyModValues", name: "Divine Orb", amounts: [1, 4, 8], reward: "Doubles sacrificed Currency", regex: "ne or"},
    {id: "Metadata/Items/Currency/CurrencyRerollRare", name: "Chaos Orb", amounts: [5, 10, 20], reward: "Doubles sacrificed Currency", regex: "os o"},
  ],
};

// An Inscribed Ultimatum copied in 3.30, from poe-item-gen's UltimatumAPITest
const item = `Item Class: Misc Map Items
Rarity: Currency
Inscribed Ultimatum
--------
Challenge: Protect the Altar
Area Level: 83
Requires Sacrifice: Divine Orb x1
Reward: Doubles sacrificed Currency
--------
Choking Miasma III
(A large and fast cloud that deals Chaos Damage over Time will follow you)
Blistering Cold II
(Many frozen pustules will periodically appear and rapidly explode when you approach)
Stalking Ruin II
(An invulnerable shade stalks you, gaining speed and inflicting Ruin with Melee Attacks and Spells
Fail on reaching 7 Ruin)
Buffs Expire Faster
(Buffs expire five times faster on Players)
Drought
(Cannot gain Flask Charges)
10% increased Monster Damage
30% more Monster Life
--------
Can be used in a personal map device to open portals to the Trialmaster's Domain and attempt his challenge. Portals will close once the challenge begins. While viewing your Atlas, Right-click this item to pinpoint its location.`;

// The in-game search: every quoted term must match a line, and a "!" term must match none
const matchesItem = (search: string) => {
  const lines = item.split("\n");
  return [...search.matchAll(/"([^"]*)"/g)].every(([, term]) => {
    const negated = term.startsWith("!");
    const regex = new RegExp(negated ? term.slice(1) : term, "i");
    return lines.some((line) => regex.test(line)) !== negated;
  });
};

const settings = (avoidModifiers: string[], rewards: string[] = [], sacrifices: string[] = []) => ({avoidModifiers, rewards, sacrifices});

describe("generateUltimatumRegex", () => {
  it("is empty without data or a selection", () => {
    expect(generateUltimatumRegex(settings(["MonsterOverwhelm"]))).toBe("");
    expect(generateUltimatumRegex(settings([]), data)).toBe("");
  });

  it("excludes the modifiers and matches any wanted reward or sacrifice", () => {
    const regex = generateUltimatumRegex(settings(
      ["MonsterOverwhelm", "MonstersApplyRuin1"], ["MirrorRare1"], ["Metadata/Items/Currency/CurrencyModValues"],
    ), data);
    expect(regex).toBe(`"!^ruin$|^ov" ": it|ne or"`);
  });

  it("ignores saved ids that are no longer in the data", () => {
    expect(generateUltimatumRegex(settings(["Removed", "MonsterOverwhelm"]), data)).toBe(`"!^ov"`);
  });

  it("keeps the copied item when it has none of the avoided modifiers", () => {
    expect(matchesItem(generateUltimatumRegex(settings(["MonsterOverwhelm", "MonstersApplyRuin1", "ChaosCloudDaemon2"]), data))).toBe(true);
  });

  it("hides the copied item when it has an avoided modifier", () => {
    expect(matchesItem(generateUltimatumRegex(settings(["ChaosCloudDaemon3"]), data))).toBe(false);
    expect(matchesItem(generateUltimatumRegex(settings(["RevenantDaemon2"]), data))).toBe(false);
    expect(matchesItem(generateUltimatumRegex(settings(["PlayerDebuffCancelFlaskEffectOnFlaskUse"]), data))).toBe(false);
  });

  it("finds the copied item by its sacrifice or reward", () => {
    expect(matchesItem(generateUltimatumRegex(settings([], [], ["Metadata/Items/Currency/CurrencyModValues"]), data))).toBe(true);
    expect(matchesItem(generateUltimatumRegex(settings([], ["CurrencyChaos5"]), data))).toBe(true);
    expect(matchesItem(generateUltimatumRegex(settings([], ["MirrorRare1"], ["Metadata/Items/Currency/CurrencyRerollRare"]), data))).toBe(false);
  });
});
