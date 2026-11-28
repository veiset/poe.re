import {describe, expect, it} from "vitest";
import type {PricedDivinationCard} from "./DivinationData";
import {maxDivinationRegexLength, selectDivinationPriceRegex} from "./DivinationOutput";

const card = (cardId: string, regex: string, chaosValue: number | undefined): PricedDivinationCard =>
  ({cardId, name: cardId, regex, chaosValue});
const select = (cards: PricedDivinationCard[], min?: number, max?: number) =>
  selectDivinationPriceRegex(cards, min, max);

describe("divination regex output", () => {
  it("filters fractional prices inclusively without rounding", () => {
    const cards = [card("a", "aa", 0.48), card("b", "bb", 0.49), card("c", "cc", 0.50)];
    expect(select(cards, 0.49, 0.49).regex).toBe('"bb"');
    expect(select(cards, 0.49, 0.50).regex).toBe('"cc|bb"');
  });

  it("excludes missing, zero, negative and non-finite prices even with no bounds", () => {
    const cards = [undefined, 0, -1, NaN, Infinity].map((price, i) => card(`${i}`, `${i}`, price));
    expect(select(cards)).toEqual({regex: "", included: [], eligibleCount: 0});
  });

  it("returns an empty result for no matches or reversed bounds", () => {
    expect(select([card("a", "aa", 1)], 2).regex).toBe("");
    expect(select([card("a", "aa", 1)], 2, 0).eligibleCount).toBe(0);
  });

  it("accepts exactly 250 characters including the surrounding quotes", () => {
    expect(select([card("a", "a".repeat(248), 1)]).regex.length).toBe(maxDivinationRegexLength);
    expect(select([card("a", "a".repeat(249), 1)]).included).toEqual([]);
  });

  it("counts separators and reports eligible cards omitted by the length limit", () => {
    const first = card("a", "a".repeat(123), 10);
    const second = card("b", "b".repeat(124), 5);
    const third = card("c", "c", 1);
    const result = select([third, second, first]);
    expect(result.regex.length).toBe(250);
    expect(result.included).toEqual([first, second]);
    expect(result.eligibleCount).toBe(3);
  });

  it("keeps a highest-priced prefix and leaves official regex syntax intact", () => {
    const cards = [card("a", "os$", 10), card("b", "b".repeat(246), 5), card("c", "c", 1)];
    expect(select(cards).regex).toBe('"os$"');
    expect(select(cards).eligibleCount).toBe(3);
  });

  it("uses stable card identity to break ties without mutating the caller's list", () => {
    const cards = [card("b", "bb", 1), card("a", "aa", 1)];
    expect(select(cards).regex).toBe('"aa|bb"');
    expect(cards[0].cardId).toBe("b");
  });
});
