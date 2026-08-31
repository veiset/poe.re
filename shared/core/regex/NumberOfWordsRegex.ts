export function wordRegex(numberOfWords: number): string {
  if (numberOfWords <= 0) return "";
  if (numberOfWords === 1) return "\\w+";
  if (numberOfWords === 2) return "\\w+ \\w+";
  if (numberOfWords > 2) return `(\\w+ ){${numberOfWords-1}}\\w+`;
  return "";
}


export function haveSameLastWord(sentenceA: string, sentenceB: string) {
  const lastA = getLastWord(sentenceA);
  const lastB = getLastWord(sentenceB);

  return Boolean(lastA) && lastA === lastB;
}

function getLastWord(sentence: string) {
  const match = sentence.trim().match(/(\w+)[^\w]*$/);
  return match ? match[1].toLowerCase() : '';
}
