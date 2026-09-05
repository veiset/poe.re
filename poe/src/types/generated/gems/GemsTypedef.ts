import {RegexResult} from "./RegexResult";
export interface GemOption {
  c: string;
  support: boolean;
}
export type GemsRegex = RegexResult<GemOption>;