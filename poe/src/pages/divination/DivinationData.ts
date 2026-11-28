import type {DivinationCardsRegex} from "@shared/typedefs/poe1/DivinationCards";

export interface PoeNinjaCardData {
  items: {id: string; name: string}[];
  lines: {id: string; primaryValue: number}[];
}

export interface PricedDivinationCard {
  cardId: string;
  name: string;
  regex: string;
  chaosValue: number | undefined;
}

export function joinDivinationPrices(
  english: DivinationCardsRegex,
  localized: DivinationCardsRegex,
  economy: PoeNinjaCardData,
): PricedDivinationCard[] {
  const nameToId = new Map(economy.items.map((item) => [item.name, item.id]));
  const idToPrice = new Map(economy.lines.map((line) => [line.id, line.primaryValue]));
  const prices = new Map<string, number>();

  for (const card of english.tokens) {
    const id = nameToId.get(card.rawText);
    const price = id === undefined ? undefined : idToPrice.get(id);
    if (price !== undefined && Number.isFinite(price) && price >= 0) {
      prices.set(card.options.cardId, price);
    }
  }

  return localized.tokens.map((card) => ({
    cardId: card.options.cardId,
    name: card.rawText,
    regex: card.regex,
    chaosValue: prices.get(card.options.cardId),
  }));
}
