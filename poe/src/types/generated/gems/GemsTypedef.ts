import {RegexResult} from "./RegexResult";
export interface GemOption {
  c: string;
  regexNoTransfiguredMatch: string;
  support: boolean;
}
export type GemsRegex = RegexResult<GemOption>;