import {describe, expect, it} from "vitest";
import {economyPriceRange} from "./EconomyPriceRange";

describe("economyPriceRange", () => {
  it("uses zero and the rounded-up highest economy price", () => {
    expect(economyPriceRange([12.5, 1203.2, 48])).toEqual({min: "0", max: "1204"});
  });

  it("ignores non-finite prices", () => {
    expect(economyPriceRange([Number.NaN, 25, Number.POSITIVE_INFINITY]))
      .toEqual({min: "0", max: "25"});
  });

  it("waits when no economy prices are available", () => {
    expect(economyPriceRange([])).toBeUndefined();
  });
});
