const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Six" for 6, used in "Six quick questions." Falls back to digits past ten. */
export function questionCountWord(count: number): string {
  return WORDS[count] ?? String(count);
}
