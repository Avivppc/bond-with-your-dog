import { tokenize } from "./text";
import type { KnowledgeChunk, KnowledgeDoc } from "./types";

/**
 * The assistant's retrieval, without embeddings: the corpus is small (a few chapters), so docs are
 * cut into ~800-character chunks and ranked against the question with BM25 keyword scoring.
 */

export const CHUNK_MAX_CHARS = 800;
export const CONTEXT_BUDGET_CHARS = 6000;
/** The lesson the member is on goes first, up to this much of the budget. */
export const PINNED_BUDGET_CHARS = 3000;

const BM25_K1 = 1.2;
const BM25_B = 0.75;

/** Split a long piece of text into ≤ max pieces, preferring sentence, then word boundaries. */
function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?。\n]+[.!?。]*\s*/g) ?? [text];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current.trim()) pieces.push(current.trim());
      current = "";
      for (let i = 0; i < sentence.length; i += max) pieces.push(sentence.slice(i, i + max).trim());
      continue;
    }
    if ((current + sentence).length > max) {
      pieces.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces.filter(Boolean);
}

/** Cut one doc into chunks of whole paragraphs where possible. */
export function chunkDoc(doc: KnowledgeDoc, maxChars: number = CHUNK_MAX_CHARS): KnowledgeChunk[] {
  const paragraphs = doc.text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => splitLong(p, maxChars));
  const texts: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 1 > maxChars) {
      texts.push(current);
      current = "";
    }
    current = current ? `${current}\n${paragraph}` : paragraph;
  }
  if (current) texts.push(current);
  return texts.map((text, index) => ({ docId: doc.id, title: doc.title, text, index }));
}

export function chunkDocs(docs: readonly KnowledgeDoc[], maxChars: number = CHUNK_MAX_CHARS): KnowledgeChunk[] {
  return docs.flatMap((doc) => chunkDoc(doc, maxChars));
}

/** BM25 score of every chunk against the question (title words count too). */
export function scoreChunks(chunks: readonly KnowledgeChunk[], question: string): number[] {
  const queryTerms = [...new Set(tokenize(question))];
  if (chunks.length === 0 || queryTerms.length === 0) return chunks.map(() => 0);

  const docs = chunks.map((c) => tokenize(`${c.title} ${c.text}`));
  const avgLen = docs.reduce((sum, d) => sum + d.length, 0) / docs.length || 1;
  const termCounts = docs.map((terms) =>
    terms.reduce((counts, t) => counts.set(t, (counts.get(t) ?? 0) + 1), new Map<string, number>()),
  );
  const docFreq = new Map(queryTerms.map((q) => [q, termCounts.filter((c) => c.has(q)).length]));

  return termCounts.map((counts, i) =>
    queryTerms.reduce((score, term) => {
      const tf = counts.get(term) ?? 0;
      if (tf === 0) return score;
      const df = docFreq.get(term) ?? 0;
      const idf = Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5));
      const norm = tf + BM25_K1 * (1 - BM25_B + (BM25_B * docs[i].length) / avgLen);
      return score + idf * ((tf * (BM25_K1 + 1)) / norm);
    }, 0),
  );
}

export interface SelectOptions {
  budgetChars?: number;
  /** Doc whose chunks go first (the member's current lesson). */
  pinnedDocId?: string | null;
  pinnedBudgetChars?: number;
}

const chunkCost = (c: KnowledgeChunk) => c.title.length + c.text.length + 8;

/**
 * Chunks to show the model, best first, within the budget: the pinned doc's opening chunks, then
 * chunks that match the question, then (if room is left) the rest in their original order so the
 * model still sees an overview when the question shares no words with the content.
 */
export function selectContext(chunks: readonly KnowledgeChunk[], question: string, options: SelectOptions = {}): KnowledgeChunk[] {
  const budget = options.budgetChars ?? CONTEXT_BUDGET_CHARS;
  const pinnedBudget = Math.min(options.pinnedBudgetChars ?? PINNED_BUDGET_CHARS, budget);
  const scores = scoreChunks(chunks, question);
  const ranked = chunks.map((chunk, i) => ({ chunk, score: scores[i], order: i }));

  const pinned = ranked.filter((r) => options.pinnedDocId && r.chunk.docId === options.pinnedDocId);
  const matching = ranked.filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);
  const rest = ranked.filter((r) => r.score <= 0);

  const picked = new Set<number>();
  const inOrder: KnowledgeChunk[] = [];
  let used = 0;
  const take = (candidates: typeof ranked, limit: number) => {
    for (const r of candidates) {
      if (picked.has(r.order)) continue;
      const cost = chunkCost(r.chunk);
      if (used + cost > limit) continue;
      picked.add(r.order);
      inOrder.push(r.chunk);
      used += cost;
    }
  };
  take(pinned, pinnedBudget);
  take(matching, budget);
  take(rest, budget);

  // Pinned first (in reading order), then by relevance, then the overview filler.
  return inOrder;
}
