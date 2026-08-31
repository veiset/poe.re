export function wordRegex(numberOfWords: number): string {
  if (numberOfWords <= 0) return "";
  if (numberOfWords === 1) return "\\w+";
  if (numberOfWords === 2) return "\\w+ \\w+";
  if (numberOfWords > 2) return `(\\w+ ){${numberOfWords-1}}\\w+`;
  return "";
}
