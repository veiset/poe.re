// typedefs for data.poe.re/generated/poe1/<patch>/mapmods/Generated.Map.<LANGUAGE>.json

import type {RegexResult} from "../RegexResult";

export interface MapOption {
  nm: boolean;
  prefix: boolean;
  rewards: Array<MapReward>;
  scary: number;
}

export interface MapReward {
  type: string;
  value: number;
}

export type MapModsRegex = RegexResult<MapOption>;
