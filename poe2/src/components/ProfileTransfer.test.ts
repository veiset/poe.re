import {describe, expect, it} from "vitest";
import {defaultSettings} from "../settings";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";
import {detectProfileGame} from "@shared/components/profile/ProfileGame";

describe("PoE2 profile transfer", () => {
  it("round-trips the default profile", () => {
    const encoded = encodeProfile(defaultSettings);
    expect(detectProfileGame(encoded)).toBe("poe2");
    expect(decodeProfile(encoded)).toEqual(defaultSettings);
  });

  it("round-trips a profile and hydrates defaults", () => {
    const profile = {...defaultSettings, name: "test"};
    expect(decodeProfile(encodeProfile(profile))).toEqual(profile);
  });

  it("stores a single vendor change as a small recursive delta", () => {
    const profile = structuredClone(defaultSettings);
    profile.name = "vendor";
    profile.vendor.vendorGroups[0].itemMods.skillLevelChaos = true;

    const encoded = encodeProfile(profile);
    expect(decodeProfile(encoded)).toEqual(profile);
    expect(encoded.length).toBeLessThan(250);
  });

  it("round-trips additional vendor groups using the default group as their baseline", () => {
    const profile = structuredClone(defaultSettings);
    profile.vendor.vendorGroups.push(structuredClone(defaultSettings.vendor.vendorGroups[0]));
    profile.vendor.vendorGroups[1].itemType.rare = true;

    expect(decodeProfile(encodeProfile(profile))).toEqual(profile);
  });

  it("imports the original full-section payload format", () => {
    const settings = {
      name: "legacy",
      vendor: {...defaultSettings.vendor, selectedGroupId: 2},
    };
    const encoded = btoa(JSON.stringify({game: "poe2", settings}));

    expect(decodeProfile(encoded)).toEqual({...defaultSettings, ...settings});
  });

  it("rejects exports for another game", () => {
    expect(() => decodeProfile(btoa(JSON.stringify({name: "poe1"})))).toThrow();
  });
});
