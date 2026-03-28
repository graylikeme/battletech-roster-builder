import { describe, it, expect } from 'vitest';
import { effectiveRulesLevel, computeBvFilterBounds } from '../src/utils.js';

describe('effectiveRulesLevel', () => {
  it('bumps STANDARD to ADVANCED for Clan tech', () => {
    const result = effectiveRulesLevel('CLAN', 'STANDARD');
    expect(result.rulesLevel).toBe('ADVANCED');
    expect(result.wasBumped).toBe(true);
  });

  it('bumps INTRODUCTORY to ADVANCED for Clan tech', () => {
    const result = effectiveRulesLevel('CLAN', 'INTRODUCTORY');
    expect(result.rulesLevel).toBe('ADVANCED');
    expect(result.wasBumped).toBe(true);
  });

  it('does not bump ADVANCED for Clan tech', () => {
    const result = effectiveRulesLevel('CLAN', 'ADVANCED');
    expect(result.rulesLevel).toBe('ADVANCED');
    expect(result.wasBumped).toBe(false);
  });

  it('does not bump EXPERIMENTAL for Clan tech', () => {
    const result = effectiveRulesLevel('CLAN', 'EXPERIMENTAL');
    expect(result.rulesLevel).toBe('EXPERIMENTAL');
    expect(result.wasBumped).toBe(false);
  });

  it('does not bump for Inner Sphere', () => {
    const result = effectiveRulesLevel('INNER_SPHERE', 'STANDARD');
    expect(result.rulesLevel).toBe('STANDARD');
    expect(result.wasBumped).toBe(false);
  });

  it('does not bump when tech base is undefined', () => {
    const result = effectiveRulesLevel(undefined, 'STANDARD');
    expect(result.rulesLevel).toBe('STANDARD');
    expect(result.wasBumped).toBe(false);
  });
});

describe('computeBvFilterBounds', () => {
  it('computes correct bounds for typical values', () => {
    const { bvMin, bvMax } = computeBvFilterBounds(8000, 4);
    expect(bvMin).toBe(300);  // floor(8000/4 * 0.15)
    expect(bvMax).toBe(7997); // 8000 - (4-1)
  });

  it('bvMin is at least 1', () => {
    const { bvMin } = computeBvFilterBounds(10, 4);
    expect(bvMin).toBeGreaterThanOrEqual(1);
  });

  it('works for single unit', () => {
    const { bvMin, bvMax } = computeBvFilterBounds(3000, 1);
    expect(bvMin).toBe(450); // floor(3000 * 0.15)
    expect(bvMax).toBe(3000); // 3000 - 0
  });

  it('works for large counts', () => {
    const { bvMin, bvMax } = computeBvFilterBounds(12000, 12);
    expect(bvMin).toBe(150); // floor(12000/12 * 0.15)
    expect(bvMax).toBe(11989); // 12000 - 11
  });
});
