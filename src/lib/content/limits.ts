/** Shared limits for lesson content lists (editor inputs and server validation use the same numbers). */
export const TAKEAWAYS = { label: "Key takeaways", maxItems: 6, maxLength: 160 } as const;
export const CUES = { label: "Cues", maxItems: 8, maxLength: 40 } as const;
export const MOVE_STEPS = { label: "Steps", maxItems: 12, maxLength: 300 } as const;
export const MIN_PRACTICE_MINUTES = 1;
export const MAX_PRACTICE_MINUTES = 60;
/** Drip: a lesson can open at most ~5 years after enrollment (keeps typos like 30000 out). */
export const MAX_DRIP_DAYS = 1825;
/** Lesson length: 24 hours. */
export const MAX_DURATION_SECONDS = 86_400;
/** Module description shown under the module heading in the member app. */
export const MAX_MODULE_DESCRIPTION = 1000;
