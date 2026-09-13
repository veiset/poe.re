import {describe, expect, it} from "vitest";
import {
  canGroupFavorites,
  composeFavoriteGroupRegex,
  favoriteGroupRegexLength,
  favoriteOrIncompatibility,
  resolveFavoriteGroups,
  selectValidFavoriteGroupMembers,
} from "./FavoriteTypes";

const favorite = (id: string, regex: string, tags: string[] = [], updatedAt = "2026-01-01T00:00:00.000Z") => ({
  kind: "favorite" as const,
  id,
  name: id,
  regex,
  tags,
  updatedAt,
});

describe("favorite groups", () => {
  it("combines AND expressions in member order and counts only their regex lengths", () => {
    const members = [favorite("one", "a b"), favorite("two", "c")];

    expect(composeFavoriteGroupRegex(members, "and")).toBe('a b "c"');
    expect(favoriteGroupRegexLength(members)).toBe(4);
  });

  it("quotes raw item regex output when composing AND groups", () => {
    const itemRegex = String.raw`-\w-.-|(-\w){5}|-\w-|Runn|rint`;
    const members = [favorite("item", itemRegex), favorite("other", '"cold"')];

    expect(composeFavoriteGroupRegex(members, "and")).toBe(`"${itemRegex}" "cold"`);
  });

  it("allows OR for individual positive quoted expressions", () => {
    const members = [favorite("one", '"fire"'), favorite("two", '"cold"')];

    expect(canGroupFavorites(members, "or")).toBe(true);
    expect(composeFavoriteGroupRegex(members, "or")).toBe('"fire|cold"');
    expect(favoriteOrIncompatibility(favorite("negative", '"!fire"'))).toBeDefined();
    expect(favoriteOrIncompatibility(favorite("multiple", '"fire" "cold"'))).toBeDefined();
  });

  it("allows a whitespace-free raw regex as one OR search term", () => {
    const itemRegex = String.raw`-\w-.-|(-\w){5}|-\w-|Runn|rint`;
    const members = [favorite("item", itemRegex), favorite("quoted", '"cold"')];

    expect(favoriteOrIncompatibility(members[0])).toBeUndefined();
    expect(canGroupFavorites(members, "or")).toBe(true);
    expect(composeFavoriteGroupRegex(members, "or")).toBe(`"${itemRegex}|cold"`);
  });

  it("requires two unique existing members within the length limit", () => {
    const candidates = [favorite("one", "one"), favorite("two", "two")];

    expect(() => selectValidFavoriteGroupMembers(candidates, ["one"], "and")).toThrow();
    expect(() => selectValidFavoriteGroupMembers(candidates, ["one", "one"], "and")).toThrow();
    expect(() => selectValidFavoriteGroupMembers(candidates, ["one", "missing"], "and")).toThrow();
  });

  it("resolves live regex, inherited tags and modification time from referenced favorites", () => {
    const entries = [
      favorite("one", "one", ["Maps"], "2026-01-02T00:00:00.000Z"),
      favorite("two", "two", ["maps", "Boss"], "2026-01-03T00:00:00.000Z"),
      {kind: "group" as const, id: "group", name: "Group", memberIds: ["two", "one"], operator: "and" as const, tags: ["Own"], updatedAt: "2026-01-01T00:00:00.000Z"},
    ];

    const group = resolveFavoriteGroups(entries)[2];
    expect(group.kind).toBe("group");
    if (group.kind !== "group") return;
    expect(group.regex).toBe('"two" "one"');
    expect(group.tags).toEqual(["Own", "maps", "Boss"]);
    expect(group.updatedAt).toBe("2026-01-03T00:00:00.000Z");
  });

  it("marks groups with missing references as invalid instead of copying partial output", () => {
    const entries = [
      favorite("one", "one"),
      {kind: "group" as const, id: "group", name: "Group", memberIds: ["one", "missing"], operator: "and" as const, tags: [], updatedAt: "2026-01-01T00:00:00.000Z"},
    ];

    const group = resolveFavoriteGroups(entries)[1];
    expect(group.kind === "group" ? group.groupResolution.issue : undefined).toBe("missing-members");
    expect(group.kind === "group" ? group.regex : undefined).toBe("");
  });

  it("revalidates the live length when a referenced favorite changes", () => {
    const entries = [
      favorite("one", "x".repeat(249)),
      favorite("two", "xx"),
      {kind: "group" as const, id: "group", name: "Group", memberIds: ["one", "two"], operator: "and" as const, tags: [], updatedAt: "2026-01-01T00:00:00.000Z"},
    ];

    const group = resolveFavoriteGroups(entries)[2];
    expect(group.kind === "group" ? group.groupResolution.issue : undefined).toBe("too-long");
  });
});
