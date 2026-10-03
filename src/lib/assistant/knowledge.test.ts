import { describe, expect, test } from "vitest";
import { CHUNK_MAX_CHARS, chunkDoc, chunkDocs, scoreChunks, selectContext } from "./knowledge";
import { stripHtml, tokenize } from "./text";
import type { KnowledgeChunk, KnowledgeDoc } from "./types";

const doc = (id: string, text: string, title = id): KnowledgeDoc => ({ id, title, text });
const chunk = (docId: string, text: string, index = 0): KnowledgeChunk => ({ docId, title: docId, text, index });

describe("text", () => {
  test("stripHtml keeps paragraphs and list items as lines and decodes entities", () => {
    expect(stripHtml("<p>Lure&nbsp;the spin.</p><ul><li>Treat</li><li>Clicker</li></ul><script>x()</script>")).toBe("Lure the spin.\n• Treat\n• Clicker");
  });

  test("tokenize lowercases, drops punctuation, stop words and one-letter tokens", () => {
    expect(tokenize("How do I teach a SPIN, step-by-step?")).toEqual(["teach", "spin", "step", "step"]);
  });

  test("tokenize keeps Hebrew words and drops Hebrew stop words", () => {
    expect(tokenize("איך מלמדים את הכלב סיבוב?")).toEqual(["מלמדים", "הכלב", "סיבוב"]);
  });
});

describe("chunkDoc", () => {
  test("keeps a short doc as one chunk", () => {
    expect(chunkDoc(doc("a", "One paragraph.\nTwo paragraph."))).toEqual([{ docId: "a", title: "a", text: "One paragraph.\nTwo paragraph.", index: 0 }]);
  });

  test("splits long docs into chunks under the size limit, keeping every word", () => {
    const sentence = "The dog spins to the left on the hand signal. ";
    const text = Array.from({ length: 6 }, () => sentence.repeat(8)).join("\n");
    const chunks = chunkDoc(doc("long", text));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= CHUNK_MAX_CHARS)).toBe(true);
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
    expect(tokenize(chunks.map((c) => c.text).join(" ")).length).toBe(tokenize(text).length);
  });

  test("hard-splits a single run-on sentence", () => {
    const chunks = chunkDoc(doc("runon", "x".repeat(2000)));
    expect(chunks.map((c) => c.text.length)).toEqual([800, 800, 400]);
  });

  test("chunkDocs flattens every doc", () => {
    expect(chunkDocs([doc("a", "Alpha"), doc("b", "Beta")]).map((c) => c.docId)).toEqual(["a", "b"]);
  });
});

describe("scoreChunks", () => {
  const chunks = [chunk("weave", "Weave between the legs, slow at first."), chunk("spin", "Spin: lure the dog in a circle, then fade the lure."), chunk("bow", "Bow: lure down between the front paws.")];

  test("ranks the chunk that matches the question highest", () => {
    const scores = scoreChunks(chunks, "How do I fade the lure for a spin?");
    expect(scores.indexOf(Math.max(...scores))).toBe(1);
  });

  test("gives zero to chunks with no shared words, and to every chunk for an empty question", () => {
    expect(scoreChunks(chunks, "spin")[0]).toBe(0);
    expect(scoreChunks(chunks, "the a of")).toEqual([0, 0, 0]);
  });

  test("works for Hebrew", () => {
    const he = [chunk("a", "סיבוב: מובילים את הכלב במעגל"), chunk("b", "קידה: מורידים את החטיף בין הכפות")];
    const scores = scoreChunks(he, "איך עושים סיבוב?");
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });
});

describe("selectContext", () => {
  const pool = [
    chunk("lesson:current", "Today's lesson: the leg weave.", 0),
    chunk("lesson:other", "Spin to the left with a hand signal.", 0),
    chunk("lesson:filler", "General warm-up routine.", 0),
  ];

  test("puts the pinned lesson first, then matches, then the rest", () => {
    const picked = selectContext(pool, "spin hand signal", { pinnedDocId: "lesson:current" });
    expect(picked.map((c) => c.docId)).toEqual(["lesson:current", "lesson:other", "lesson:filler"]);
  });

  test("stays within the character budget", () => {
    const big = Array.from({ length: 20 }, (_, i) => chunk(`d${i}`, `spin ${"x".repeat(700)}`));
    const picked = selectContext(big, "spin", { budgetChars: 2000 });
    const used = picked.reduce((sum, c) => sum + c.title.length + c.text.length + 8, 0);
    expect(picked.length).toBe(2);
    expect(used).toBeLessThanOrEqual(2000);
  });

  test("caps the pinned lesson so other matches still fit", () => {
    const pinned = Array.from({ length: 6 }, (_, i) => chunk("lesson:current", "y".repeat(700), i));
    const picked = selectContext([...pinned, chunk("lesson:match", "spin details")], "spin", { pinnedDocId: "lesson:current", budgetChars: 4000, pinnedBudgetChars: 1500 });
    // Two pinned chunks fit the pinned share; the match comes next; leftover room is filled after.
    expect(picked.slice(0, 3).map((c) => c.docId)).toEqual(["lesson:current", "lesson:current", "lesson:match"]);
  });

  test("returns nothing for an empty corpus", () => {
    expect(selectContext([], "spin")).toEqual([]);
  });
});
