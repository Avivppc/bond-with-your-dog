import type { EditableText, FieldTarget } from "@/lib/site/inline-edit";

/**
 * Editing text on the page inside the editor's preview. Each section carries the texts it shows
 * (data-edit-map); this finds them in the section's elements, marks them, and turns a clicked one
 * into an editable field whose typing is sent to the editor. Browser-only helpers for PreviewBridge.
 */

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Visible text without Material Symbols icon names (an icon is text in a span). */
function textOf(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(".material-symbols-outlined, .sr-only").forEach((n) => n.remove());
  return norm(clone.textContent ?? "");
}

const SKIP = "a, button, summary, [data-preview-insert], svg, script, style";

/** The deepest element in `root` showing exactly `shown` (and nothing else). */
function findText(root: Element, shown: string): HTMLElement | null {
  const target = norm(shown);
  let found: HTMLElement | null = null;
  root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, p, span, li, blockquote, figcaption, div, dd, dt, label, td, strong, em").forEach((el) => {
    if (el.closest(SKIP) || el.querySelector("img, video, iframe, input")) return;
    if (textOf(el) !== target) return;
    // Prefer the innermost match whose text is the whole element.
    if (!found || found.contains(el)) found = el;
  });
  return found;
}

function parseMap<T>(raw: string | undefined): T[] {
  try {
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

/** Marks every text on the page that can be typed into. Safe to call again after a re-render. */
export function markEditable(): void {
  document.querySelectorAll<HTMLElement>("[data-section-id]").forEach((section) => {
    for (const entry of parseMap<EditableText>(section.dataset.editMap)) {
      const el = findText(section, entry.shown);
      if (!el || el.dataset.editPath) continue;
      el.dataset.editPath = entry.path;
      el.dataset.editMax = String(entry.max);
      if (entry.highlight) el.dataset.editHighlight = "1";
    }
  });
}

/**
 * The value of an edited element. In a highlight field, words in the accent span go back inside
 * *stars*; line breaks become new lines.
 */
export function valueOf(el: HTMLElement): string {
  // Text nodes, not innerText: innerText applies CSS (an "uppercase" eyebrow would be saved in capitals).
  const highlight = Boolean(el.dataset.editHighlight);
  const parts: string[] = [];
  const walk = (node: Node, accent: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) parts.push(accent ? `*${node.textContent ?? ""}*` : (node.textContent ?? ""));
    else if (node instanceof HTMLBRElement) parts.push("\n");
    else if (node instanceof HTMLElement && !node.classList.contains("material-symbols-outlined")) {
      const isAccent = highlight && !accent && node.tagName === "SPAN" && node.className.trim() !== "";
      node.childNodes.forEach((c) => walk(c, accent || isAccent));
    }
  };
  el.childNodes.forEach((c) => walk(c, false));
  return parts.join("").replace(/\*\*/g, "").replace(/\u00a0/g, " ").trim();
}

/** The field behind a clicked image or button, if the section knows one. */
export function targetFor(section: HTMLElement, clicked: HTMLElement): FieldTarget | null {
  const targets = parseMap<FieldTarget>(section.dataset.targetMap);
  const image = clicked.closest("img");
  if (image) {
    const src = image.getAttribute("src") ?? "";
    return targets.find((t) => t.kind === "image" && (src === t.match || src.endsWith(t.match))) ?? null;
  }
  const button = clicked.closest("a, button");
  if (button) {
    const label = textOf(button);
    return targets.find((t) => t.kind === "link" && label.startsWith(norm(t.match))) ?? null;
  }
  return null;
}

/** Styles for editable text in the preview (hover hint, editing outline). */
export const INLINE_CSS = `
[data-edit-path]{cursor:text;border-radius:4px;transition:box-shadow .15s}
[data-edit-path]:hover{box-shadow:0 0 0 2px rgba(37,99,235,.35)}
[data-edit-path][contenteditable]{box-shadow:0 0 0 2px #2563eb;outline:none;background:rgba(37,99,235,.04)}
`;

/** Stops typing past the field's limit (the same limit the side panel has). */
export function blockedByLimit(el: HTMLElement, e: InputEvent): boolean {
  const max = Number(el.dataset.editMax ?? "0");
  if (!max || !e.inputType.startsWith("insert")) return false;
  const selected = window.getSelection()?.toString().length ?? 0;
  return valueOf(el).length - selected + (e.data?.length ?? 1) > max;
}
