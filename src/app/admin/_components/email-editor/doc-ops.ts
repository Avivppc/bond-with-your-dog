import type { EmailBlock, EmailDoc } from "@/lib/email-blocks/types";

/** Immutable edits to an EmailDoc, used by the block editor. Every function returns a new doc. Pure. */

/** Text fields that accept {{tags}} (the "Insert tag" chips write into these). */
export type TextFieldName = "text" | "label" | "url" | "alt" | "href" | "src" | "title" | "author";

export type FieldTarget = { scope: "doc"; field: "subject" | "preheader" } | { scope: "block"; id: string; field: TextFieldName };

/** A partial update for one kind of block (never its id or type). Distributes over the union. */
export type BlockPatch<B extends EmailBlock = EmailBlock> = B extends EmailBlock ? Partial<Omit<B, "id" | "type">> : never;

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length, index));
}

export function insertBlock(doc: EmailDoc, index: number, block: EmailBlock): EmailDoc {
  const at = clampIndex(index, doc.blocks.length);
  return { ...doc, blocks: [...doc.blocks.slice(0, at), block, ...doc.blocks.slice(at)] };
}

/**
 * Moves a block to a drop position. `toIndex` counts gaps in the current list (0 = before the
 * first block, length = after the last), the way a drop indicator shows it.
 */
export function moveBlockTo(doc: EmailDoc, id: string, toIndex: number): EmailDoc {
  const from = doc.blocks.findIndex((b) => b.id === id);
  if (from === -1) return doc;
  const gap = clampIndex(toIndex, doc.blocks.length);
  const target = gap > from ? gap - 1 : gap;
  if (target === from) return doc;
  const rest = doc.blocks.filter((b) => b.id !== id);
  return { ...doc, blocks: [...rest.slice(0, target), doc.blocks[from], ...rest.slice(target)] };
}

/** Moves a block one place up (-1) or down (+1). */
export function moveBlockBy(doc: EmailDoc, id: string, delta: -1 | 1): EmailDoc {
  const from = doc.blocks.findIndex((b) => b.id === id);
  if (from === -1) return doc;
  return moveBlockTo(doc, id, delta < 0 ? from - 1 : from + 2);
}

export function duplicateBlock(doc: EmailDoc, id: string, newId: string): EmailDoc {
  const index = doc.blocks.findIndex((b) => b.id === id);
  if (index === -1) return doc;
  return insertBlock(doc, index + 1, { ...doc.blocks[index], id: newId });
}

export function removeBlock(doc: EmailDoc, id: string): EmailDoc {
  return { ...doc, blocks: doc.blocks.filter((b) => b.id !== id) };
}

export function patchBlock(doc: EmailDoc, id: string, patch: BlockPatch): EmailDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((b) => (b.id === id ? ({ ...b, ...patch, id: b.id, type: b.type } as EmailBlock) : b)),
  };
}

/** Writes a text field addressed by a FieldTarget (no-op if the block or field is gone). */
export function setTextField(doc: EmailDoc, target: FieldTarget, text: string): EmailDoc {
  if (target.scope === "doc") return { ...doc, [target.field]: text };
  const block = doc.blocks.find((b) => b.id === target.id);
  if (!block || !(target.field in block)) return doc;
  return patchBlock(doc, target.id, { [target.field]: text } as BlockPatch);
}

/** Inserts text over the selection; returns the new value and where the caret goes. */
export function insertAtCursor(value: string, start: number, end: number, insert: string): { value: string; caret: number } {
  const from = clampIndex(Math.min(start, end), value.length);
  const to = clampIndex(Math.max(start, end), value.length);
  return { value: value.slice(0, from) + insert + value.slice(to), caret: from + insert.length };
}
