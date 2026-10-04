import {regexSearch} from "./ReverseRegexLookup";

const areaOfEffect = "Monsters have (45-100)% increased Area of Effect";
const projectiles = "Monsters fire 2 additional Projectiles|Monsters have 100% increased Area of Effect";
const uniqueBoss = "Unique Boss has (25-35)% increased Life|Unique Boss has (45-70)% increased Area of Effect";

describe("regexSearch", () => {
  test("\\d matches a whole range group as well as a digit", () => {
    expect(regexSearch("(50-500)% hello", "\\d+% hel")).toBe(true);
    expect(regexSearch("100% hello", "\\d+% hel")).toBe(true);
    expect(regexSearch("(50-500) hello", "\\d+ hel")).toBe(true);
    expect(regexSearch("100 hello", "\\d+ hel")).toBe(true);
  });

  test("matches the Area of Effect mods like in game", () => {
    expect(regexSearch(areaOfEffect, "\"!e \\d+% increased ar\"")).toBe(true);
    expect(regexSearch(projectiles, "\"!e \\d+% increased ar\"")).toBe(true);
    expect(regexSearch(areaOfEffect, "\"\\d+% increased area of effect\"")).toBe(true);
    expect(regexSearch(uniqueBoss, "\"\\d+% increased area of effect\"")).toBe(true);
    expect(regexSearch(areaOfEffect, "\\d%+ increased area of effect")).toBe(true);
    expect(regexSearch(uniqueBoss, "\\d%+ increased area of effect")).toBe(true);
  });

  test("does not match a mod the in-game regex would not match", () => {
    expect(regexSearch(uniqueBoss, "\"!e \\d+% increased ar\"")).toBe(false);
  });

  test("^ and $ anchor to each line of a multi-line mod", () => {
    expect(regexSearch(uniqueBoss, "\"d life$\"")).toBe(true);
    expect(regexSearch(uniqueBoss, "\"^unique boss has \\d+% increased ar\"")).toBe(true);
  });

  test("boat mods: em dash ranges, negative ranges and ' | ' separated lines", () => {
    const boat = "+(26—40)% Monster Chaos Resistance | 55% increased Quantity of Items found in adjacent Areas";
    expect(regexSearch(boat, "\"^\\+\\d+% monster ch\"")).toBe(true);
    expect(regexSearch(boat, "\"resistance$\"")).toBe(true);
    expect(regexSearch(boat, "\"^\\d+% increased q\"")).toBe(true);
    expect(regexSearch("Players have (-10—-5)% to Fire Resistance", "\"\\d+% to f\"")).toBe(true);
    expect(regexSearch("Players have (1.5-2.5)% to Fire Resistance", "\"\\d+% to f\"")).toBe(true);
  });

  test("[A|B] terms are matched as B, like in game", () => {
    const thorns = "Rare Monsters have [PhysicalThorns|Physical Thorns] reflecting (400-800) Physical Damage";
    expect(regexSearch(thorns, "\"ve phy\"")).toBe(true);
    expect(regexSearch(thorns, "\"^rare monsters have physical thorns reflecting \\d+ physical damage$\"")).toBe(true);
    expect(regexSearch(thorns, "\"physicalthorns\"")).toBe(false);
    expect(regexSearch("Area has [Onslaught]", "\"has onslaught$\"")).toBe(true);
  });

  test("is case-insensitive and keeps the multi-term query syntax", () => {
    expect(regexSearch(areaOfEffect, "\"AREA OF\"")).toBe(true);
    expect(regexSearch(areaOfEffect, "\"!xyz\" \"!e \\d+% inc\"")).toBe(true);
    expect(regexSearch(areaOfEffect, "\"!xyz\" \"!abc\"")).toBe(false);
  });

  test("an empty or invalid query matches nothing", () => {
    expect(regexSearch(areaOfEffect, "")).toBe(false);
    expect(regexSearch(areaOfEffect, "\"(\"")).toBe(false);
  });
});
