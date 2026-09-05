import {RegexResult} from "./RegexResult";
export interface WaystoneOption {
  name: string;
  prefix: boolean;
  tags: string[];
}
export type WaystoneRegex = RegexResult<WaystoneOption>;