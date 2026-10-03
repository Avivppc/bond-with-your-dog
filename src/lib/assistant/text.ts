/** Text helpers for the assistant's knowledge base (pure). */

const ENTITIES: Readonly<Record<string, string>> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/** Lesson HTML → readable plain text: block tags become line breaks, everything else is dropped. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  const withBreaks = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
  const decoded = withBreaks.replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m);
  return normalizeSpace(decoded);
}

/** Collapse runs of spaces, keep single blank lines between paragraphs. */
export function normalizeSpace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v\r]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Words that carry no meaning for matching (English + common Hebrew function words). */
const STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does", "for", "from", "how", "i", "if",
  "in", "is", "it", "its", "me", "my", "of", "on", "or", "so", "that", "the", "this", "to", "was", "what",
  "when", "where", "which", "who", "why", "will", "with", "you", "your", "we", "our", "they", "them", "he",
  "she", "his", "her", "am", "has", "have", "had", "should", "would", "could", "there", "about", "into",
  "של", "את", "על", "עם", "זה", "זו", "זאת", "מה", "איך", "אני", "אתה", "הוא", "היא", "הם", "לא",
  "כן", "גם", "או", "אם", "כי", "יש", "אין", "אל", "עד", "כל", "רק", "מי", "למה", "לי", "שלי", "שלו",
]);

/**
 * Lowercase words for matching. Splits on anything that isn't a letter or digit, so it works for
 * Hebrew (no case, whitespace-separated) as well as English. Drops one-letter tokens and stop words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}
