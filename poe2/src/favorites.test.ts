import {describe, expect, it} from "vitest";
import {parseFavorites, updateStaticFavorite} from "./favorites";

const standardFavorite = {
  schemaVersion: 1,
  id: "favorite",
  name: "Favorite",
  description: "",
  color: "#c6930a",
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  pageKey: "vendor",
  regex: "regex",
  configuration: {},
  context: {},
};

describe("PoE 2 favorite parsing", () => {
  it("accepts production favorites without a kind discriminator", () => {
    expect(parseFavorites([standardFavorite])).toMatchObject([{...standardFavorite, kind: "favorite"}]);
  });

  it("keeps the unreleased group format strict", () => {
    const baseGroup = {...standardFavorite, id: "group", kind: "group", operator: "and", memberIds: ["one", "two"]};
    expect(parseFavorites([baseGroup])).toHaveLength(1);
    expect(parseFavorites([{...baseGroup, memberIds: ["one"]}])).toEqual([]);
    expect(parseFavorites([{...baseGroup, operator: "xor"}])).toEqual([]);
  });

  it("deduplicates persisted IDs", () => {
    expect(parseFavorites([standardFavorite, standardFavorite])).toHaveLength(1);
  });

  it("parses static favorites without generator fields", () => {
    const {pageKey: _pageKey, configuration: _configuration, context: _context, ...base} = standardFavorite;
    expect(parseFavorites([{...base, kind: "static", regex: '"custom"'}])).toMatchObject([{kind: "static", regex: '"custom"'}]);
  });

  it("rejects updates when a static favorite no longer exists", () => {
    expect(() => updateStaticFavorite("missing-profile", "missing", '"changed"', {name: "Missing", description: "", color: "#c6930a", tags: []})).toThrow("Static favorite not found.");
  });
});
