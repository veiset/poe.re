import {describe, expect, it} from "vitest";
import {defaultSettings} from "../../utils/SavedSettings";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";
import {detectProfileGame} from "@shared/components/profile/ProfileGame";

describe("profile transfer", () => {
  it("round-trips the default profile", () => {
    const encoded = encodeProfile(defaultSettings);
    expect(detectProfileGame(encoded)).toBe("poe");
    expect(decodeProfile(encoded)).toEqual(defaultSettings);
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

  it("rejects PoE2 exports", () => {
    const encoded = btoa(JSON.stringify({game: "poe2", settings: {name: "wrong game"}}));
    expect(() => decodeProfile(encoded)).toThrow();
  });
});
