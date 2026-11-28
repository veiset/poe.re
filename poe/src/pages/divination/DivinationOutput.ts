import type {PricedDivinationCard} from "./DivinationData";

export interface DivinationPriceRegexResult {
  regex: string;
  included: PricedDivinationCard[];
  eligibleCount: number;
}

export const maxDivinationRegexLength = 250;

export function selectDivinationPriceRegex(
  cards: PricedDivinationCard[],
  minValue: number | undefined,
  maxValue: number | undefined,
): DivinationPriceRegexResult {
  const eligible = cards
    .filter((card): card is PricedDivinationCard & {chaosValue: number} =>
      card.chaosValue !== undefined && Number.isFinite(card.chaosValue) && card.chaosValue > 0,
    )
    .filter((card) => (minValue === undefined || card.chaosValue >= minValue)
      && (maxValue === undefined || card.chaosValue <= maxValue))
    .sort((a, b) => b.chaosValue - a.chaosValue || a.cardId.localeCompare(b.cardId));
  const included: PricedDivinationCard[] = [];
  let regex = "";

  for (const card of eligible) {
    const next = regex.length === 0 ? card.regex : `${regex}|${card.regex}`;
    if (next.length + 2 > maxDivinationRegexLength) break;
    regex = next;
    included.push(card);
  }

  return {
    regex: regex.length > 0 ? `"${regex}"` : "",
    included,
    eligibleCount: eligible.length,
  };
}
