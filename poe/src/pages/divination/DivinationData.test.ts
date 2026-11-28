import {describe, expect, it} from "vitest";
import type {DivinationCardsRegex} from "@shared/typedefs/poe1/DivinationCards";
import {joinDivinationPrices, PoeNinjaCardData} from "./DivinationData";

const catalog = (name: string, regex: string, id = 1): DivinationCardsRegex => ({
  tokens: [{id, rawText: name, generalizedText: name.toLowerCase(), regex, options: {
    cardId: "Metadata/Items/DivinationCards/DivinationCardTheDoctor",
    stackSize: 8, reward: "Headhunter", flavourText: "", icon: "", tags: [],
  }}],
  optimizationTable: {},
});
const english = catalog("The Doctor", "xam");
const portuguese = catalog("O Doutor", "klo", 999);
const economy = (price: number): PoeNinjaCardData => ({
  items: [{id: "the-doctor", name: "The Doctor"}],
  lines: [{id: "the-doctor", primaryValue: price}],
});

describe("divination price join", () => {
  it("joins English names to localized cards by cardId, preserving exact prices and local regexes", () => {
    expect(joinDivinationPrices(english, portuguese, economy(0.49))).toEqual([{
      cardId: english.tokens[0].options.cardId, name: "O Doutor", regex: "klo", chaosValue: 0.49,
    }]);
  });

  it.each<PoeNinjaCardData>([
    {items: [], lines: []},
    {items: economy(1).items, lines: []},
    {items: [{id: "other", name: "Unknown card"}], lines: economy(1).lines},
    economy(NaN), economy(Infinity), economy(-1),
  ])("keeps unpriced cards visible with an undefined price (%#)", (data) => {
    expect(joinDivinationPrices(english, portuguese, data)).toHaveLength(1);
    expect(joinDivinationPrices(english, portuguese, data)[0].chaosValue).toBeUndefined();
  });

  it("does not confuse a zero price with an absent price", () => {
    expect(joinDivinationPrices(english, portuguese, economy(0))[0].chaosValue).toBe(0);
  });

  it("does not assign another card's price when a localized card has no English counterpart", () => {
    const other = catalog("Outra carta", "other");
    other.tokens[0].options.cardId = "Metadata/Other";
    expect(joinDivinationPrices(english, other, economy(5))[0].chaosValue).toBeUndefined();
  });
});
