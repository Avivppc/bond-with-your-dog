/** Y-axis scale for the admin's line charts. Pure. */

/** Round steps (× a power of ten). */
const STEPS = [1, 2, 4, 6, 8, 10] as const;
/** Smallest axis, so the half-way tick of a count (1 → 0.5) is never a fraction. */
const MIN_AXIS = 2;

/**
 * The top of the axis: the smallest round number ≥ the data's maximum (42720 cents → 60000,
 * i.e. $600). 0 when there is no data, so the chart draws a flat "0" axis instead of fake cents.
 */
export function niceAxisMax(dataMax: number): number {
  if (!Number.isFinite(dataMax) || dataMax <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(dataMax));
  const step = STEPS.find((s) => s * magnitude >= dataMax) ?? 10;
  return Math.max(MIN_AXIS, step * magnitude);
}

/** Tick values from the top down (top, middle, 0); with no data only the 0 tick is labelled. */
export function axisTicks(axisMax: number): (number | null)[] {
  return axisMax > 0 ? [axisMax, axisMax / 2, 0] : [null, null, 0];
}
