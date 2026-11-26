import {describe, expect, it} from "vitest";
import {defaultSettings} from "../settings";
import {exportSettings, readProfile} from "./ProfileTransfer";

describe("PoE2 profile transfer", () => {
  it("round-trips the default profile", () => {
    expect(readProfile(exportSettings(defaultSettings))).toEqual(defaultSettings);
  });

  it("round-trips a profile and hydrates defaults", () => {
    const profile = {...defaultSettings, name: "test"};
    expect(readProfile(exportSettings(profile))).toEqual(profile);
  });

  it("stores a single vendor change as a small recursive delta", () => {
    const profile = structuredClone(defaultSettings);
    profile.name = "vendor";
    profile.vendor.vendorGroups[0].itemMods.skillLevelChaos = true;

    const exported = exportSettings(profile);
    expect(readProfile(exported)).toEqual(profile);
    expect(JSON.stringify(exported).length).toBeLessThan(150);
  });

  it("round-trips additional vendor groups using the default group as their baseline", () => {
    const profile = structuredClone(defaultSettings);
    profile.vendor.vendorGroups.push(structuredClone(defaultSettings.vendor.vendorGroups[0]));
    profile.vendor.vendorGroups[1].itemType.rare = true;

    expect(readProfile(exportSettings(profile))).toEqual(profile);
  });

  it("reads the original full-section format", () => {
    const settings = {
      name: "legacy",
      vendor: {...defaultSettings.vendor, selectedGroupId: 2},
    };

    expect(readProfile(settings)).toEqual({...defaultSettings, ...settings, version: 1});
  });

  it("keeps the profile version, and reads settings without one as version 1", () => {
    expect(readProfile(exportSettings({...defaultSettings, version: 1})).version).toBe(1);
    expect(readProfile({name: "old"}).version).toBe(1);
  });
});
