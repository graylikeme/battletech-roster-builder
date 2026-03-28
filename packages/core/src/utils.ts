import type { TechBase, RulesLevel } from './models.js';

/**
 * Clan tech requires at least ADVANCED rules level.
 * Returns the effective rules level and whether it was auto-bumped.
 */
export function effectiveRulesLevel(
  techBase: TechBase | string | undefined,
  rulesLevel: RulesLevel,
): { rulesLevel: RulesLevel; wasBumped: boolean } {
  if (techBase === 'CLAN' && (rulesLevel === 'INTRODUCTORY' || rulesLevel === 'STANDARD')) {
    return { rulesLevel: 'ADVANCED', wasBumped: true };
  }
  return { rulesLevel, wasBumped: false };
}

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
