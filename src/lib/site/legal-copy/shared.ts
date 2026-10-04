/** Joins block-level HTML without whitespace between the blocks (as the hand-built JSX rendered). */
export const blocks = (...parts: string[]): string => parts.join("");

/** Shown as "Last updated" on every legal page. Change it whenever the wording of any of them changes. */
export const LEGAL_UPDATED = "October 4, 2026";
