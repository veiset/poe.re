import {RegexResult} from "./RegexResult";
export interface MapOption {
  nightmare: boolean;
  prefix: boolean;
  rewards: string[];
  scary: number;
}
export type MapModsRegex = RegexResult<MapOption>;