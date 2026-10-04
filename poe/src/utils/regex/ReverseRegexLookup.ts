export const regexSearch = (value: string, s: string | undefined) => {
  if (!s) return false;
  const regexp = reverseRegexLookupSanitize(s);
  // The game matches one line at a time, so ^ and $ anchor to each line of a mod
  return regexp ? inGameText(value.toLowerCase()).split("|").some(line => regexp.test(line.trim())) : false;
}

// Terms are written "[PhysicalThorns|Physical Thorns]", in game only the last part is shown
export const inGameText = (value: string): string => value.replace(/\[(?:[^\]|]*\|)*([^\]|]*)\]/g, "$1");

// Ranges like "(45-100)" are a single number in game, so \d also matches a whole range group
const digitOrRange = String.raw`(?:\d|\(-?\d+(?:\.\d+)?[-—]-?\d+(?:\.\d+)?\))`;

const reverseRegexLookupSanitize = (regex: string): RegExp | undefined => {
  try {
    const sanitized = regex.toLowerCase()
      .split("\" ")
      .join("|")
      .replace(/\\"(?:m q|iz).*%/, "")
      .replaceAll("\"", "")
      .replaceAll("!", "")
      .trim();
    return new RegExp(sanitized.replaceAll("\\d", digitOrRange));
  } catch (e) {
    return undefined;
  }
}
