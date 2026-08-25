import {describe, expect, it} from "vitest";
import {generatePriceRangeRegex, PriceCurrency} from "./GeneratePriceRangeRegex";

const matches = (regex: string, price: number, currency: PriceCurrency) => {
  const body = regex.slice(1, -1);
  return new RegExp(body).test(`Note: ${price} ${currency}`);
};

describe("generatePriceRangeRegex", () => {
  it("matches an inclusive range without matching adjacent values", () => {
    const regex = generatePriceRangeRegex("8", "123", "chaos");
    expect(matches(regex, 7, "chaos")).toBe(false);
    expect(matches(regex, 8, "chaos")).toBe(true);
    expect(matches(regex, 99, "chaos")).toBe(true);
    expect(matches(regex, 123, "chaos")).toBe(true);
    expect(matches(regex, 124, "chaos")).toBe(false);
  });

  it("matches only the selected currency", () => {
    const regex = generatePriceRangeRegex("100", "999", "divine");
    expect(matches(regex, 100, "divine")).toBe(true);
    expect(matches(regex, 999, "divine")).toBe(true);
    expect(matches(regex, 100, "chaos")).toBe(false);
  });

  it("normalizes reversed and out-of-bounds values", () => {
    const regex = generatePriceRangeRegex("1200", "-5", "chaos");
    expect(matches(regex, 0, "chaos")).toBe(true);
    expect(matches(regex, 999, "chaos")).toBe(true);
    expect(matches(regex, 1000, "chaos")).toBe(false);
  });

  it("keeps the full selectable range compact", () => {
    const regex = generatePriceRangeRegex("0", "999", "chaos");
    expect(regex).toBe('"(0|[1-9]\\d{0,2}) chaos"');
    expect(regex.length).toBeLessThan(40);
  });

  it("uses the slider limits for empty endpoints", () => {
    expect(generatePriceRangeRegex("", "25", "chaos"))
      .toBe(generatePriceRangeRegex("0", "25", "chaos"));
    expect(generatePriceRangeRegex("25", "", "chaos"))
      .toBe(generatePriceRangeRegex("25", "999", "chaos"));
  });
});
