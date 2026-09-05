import {RegexResult} from "./RegexResult";
export interface MapOption {
  nm: boolean;
  prefix: boolean;
  rewards: string[];
  scary: number;
}
export type BoatModsRegex = RegexResult<MapOption>;