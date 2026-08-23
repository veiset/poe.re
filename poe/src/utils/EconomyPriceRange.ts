export interface EconomyPriceRange {
  min: string;
  max: string;
}

export function economyPriceRange(prices: number[]): EconomyPriceRange | undefined {
  const validPrices = prices.filter(Number.isFinite);
  if (validPrices.length === 0) return undefined;
  return {
    min: "0",
    max: String(Math.ceil(Math.max(...validPrices))),
  };
}
