import {RegexResult} from "./RegexResult";
export interface TabletOption {
  prefix: boolean;
  tags: string[];
}
export type TabletRegex = RegexResult<TabletOption>;
