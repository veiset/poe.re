export const PRICE_RANGE_MIN = 0;
export const PRICE_RANGE_MAX = 999;

export interface NormalizedPriceRange {
  min: number;
  max: number;
}

export function normalizePriceRange(minValue: string, maxValue: string): NormalizedPriceRange | undefined {
  const rawMin = minValue.trim() === "" ? PRICE_RANGE_MIN : Number(minValue);
  const rawMax = maxValue.trim() === "" ? PRICE_RANGE_MAX : Number(maxValue);
  if (!Number.isInteger(rawMin) || !Number.isInteger(rawMax)) return undefined;

  return {
    min: Math.max(PRICE_RANGE_MIN, Math.min(PRICE_RANGE_MAX, Math.min(rawMin, rawMax))),
    max: Math.max(PRICE_RANGE_MIN, Math.min(PRICE_RANGE_MAX, Math.max(rawMin, rawMax))),
  };
}
