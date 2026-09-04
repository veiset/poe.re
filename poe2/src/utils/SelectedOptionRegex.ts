import {SelectOption} from "../settings";
import {generateBoundedValueRegex} from "@shared/core/regex/GenerateNumberRegex";

export type NumericRegexPosition = "before" | "after";

export function numericRegexPosition(option: Pick<SelectOption, "name" | "regex">): NumericRegexPosition | undefined {
  const numberIndex = option.name.indexOf("#");
  if (numberIndex === -1) return undefined;

  try {
    const match = new RegExp(option.regex, "i").exec(option.name.replaceAll("#", "0"));
    if (!match || match.index === undefined) return undefined;

    const matchEnd = match.index + match[0].length;
    if (matchEnd <= numberIndex) return "before";
    if (match.index > numberIndex) return "after";
  } catch {
    // Do not offer a numeric filter if the game regex cannot be safely positioned in JavaScript.
  }

  return undefined;
}

export function selectedOptionRegex(
  option: SelectOption,
  round10: boolean,
): string {
  const position = numericRegexPosition(option);
  if (option.value === null || !position || !option.ranges[0]) return option.regex;

  const valueRegex = generateBoundedValueRegex(option.value.toString(), option.ranges[0][1].toString(), round10);
  return position === "before"
    ? `${option.regex}.*${valueRegex}`
    : `${valueRegex}.*${option.regex}`;
}
