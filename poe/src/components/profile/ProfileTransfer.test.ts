import {describe, expect, it} from "vitest";
import {defaultSettings} from "../../utils/SavedSettings";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";

describe("profile transfer", () => {
  it("round-trips the default profile", () => {
    expect(decodeProfile(encodeProfile(defaultSettings))).toEqual(defaultSettings);
  });

  it("hydrates omitted defaults while preserving changes", () => {
    const settings = {
      ...defaultSettings,
      name: "mapping",
      map: {...defaultSettings.map, badIds: [12, 34]},
    };

    expect(decodeProfile(encodeProfile(settings))).toEqual(settings);
  });

  it("imports legacy default exports that omitted the name", () => {
    expect(decodeProfile(btoa("{}"))).toEqual(defaultSettings);
  });

  it("rejects non-object payloads", () => {
    expect(() => decodeProfile(btoa("null"))).toThrow();
  });
});
