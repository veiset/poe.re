// typedefs for data.poe.re/generated/poe1/<patch>/divination-cards/Generated.DivinationCards.<LANGUAGE>.json

import type {RegexResult} from "../RegexResult";

export interface DivinationCardOption {
  cardId: string;
  flavourText: string;
  icon: string;
  reward: string;
  stackSize: number;
  tags: Array<string>;
}

export type DivinationCardsRegex = RegexResult<DivinationCardOption>;
