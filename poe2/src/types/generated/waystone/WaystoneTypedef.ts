import {RegexResult} from "./RegexResult";
export interface WaystoneOption {
  name: string;
  tags: string[];
  types: string[];
}
export type WaystoneRegex = RegexResult<WaystoneOption>;