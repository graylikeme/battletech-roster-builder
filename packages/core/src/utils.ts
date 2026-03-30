/**
 * Compute smart BV pre-filtering bounds for API queries.
 * bvMin: no unit cheaper than 15% of per-unit average (eliminates chaff)
 * bvMax: no single unit can exceed budget minus minimum for remaining slots
 */
export function computeBvFilterBounds(
  bv: number,
  count: number,
): { bvMin: number; bvMax: number } {
  return {
    bvMin: Math.max(1, Math.floor(bv / count * 0.15)),
    bvMax: bv - (count - 1),
  };
}
