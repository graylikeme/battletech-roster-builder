import { describe, it, expect } from 'vitest';
import {
  ERAS, MISSIONS, ROLES, WEIGHT_CLASSES, FACTION_TYPES, TECH_BASES, RULES_LEVELS,
  weightClassFromTonnage, allowedRulesLevels,
  type Era, type Mission, type Role, type WeightClass,
} from '../src/models.js';

describe('Enums', () => {
  it('has 10 eras', () => {
    expect(ERAS).toHaveLength(10);
    expect(ERAS).toContain('CLAN_INVASION');
    expect(ERAS).toContain('IL_CLAN');
  });

  it('has 8 missions', () => {
    expect(MISSIONS).toHaveLength(8);
    expect(MISSIONS).toContain('pitched_battle');
    expect(MISSIONS).toContain('zone_control');
  });

  it('has 7 roles', () => {
    expect(ROLES).toHaveLength(7);
    expect(ROLES).toContain('Brawler');
    expect(ROLES).toContain('Missile Boat');
    expect(ROLES).toContain('Scout');
  });

  it('has 4 weight classes', () => {
    expect(WEIGHT_CLASSES).toHaveLength(4);
  });

  it('has 5 faction types', () => {
    expect(FACTION_TYPES).toHaveLength(5);
  });

  it('has 5 rules levels', () => {
    expect(RULES_LEVELS).toHaveLength(5);
  });
});

describe('weightClassFromTonnage', () => {
  it('classifies light mechs (20-35t)', () => {
    expect(weightClassFromTonnage(20)).toBe('LIGHT');
    expect(weightClassFromTonnage(25)).toBe('LIGHT');
    expect(weightClassFromTonnage(35)).toBe('LIGHT');
  });

  it('classifies medium mechs (40-55t)', () => {
    expect(weightClassFromTonnage(40)).toBe('MEDIUM');
    expect(weightClassFromTonnage(50)).toBe('MEDIUM');
    expect(weightClassFromTonnage(55)).toBe('MEDIUM');
  });

  it('classifies heavy mechs (60-75t)', () => {
    expect(weightClassFromTonnage(60)).toBe('HEAVY');
    expect(weightClassFromTonnage(65)).toBe('HEAVY');
    expect(weightClassFromTonnage(75)).toBe('HEAVY');
  });

  it('classifies assault mechs (80-100t)', () => {
    expect(weightClassFromTonnage(80)).toBe('ASSAULT');
    expect(weightClassFromTonnage(95)).toBe('ASSAULT');
    expect(weightClassFromTonnage(100)).toBe('ASSAULT');
  });

  it('throws for invalid tonnage', () => {
    expect(() => weightClassFromTonnage(10)).toThrow();
    expect(() => weightClassFromTonnage(37)).toThrow();
    expect(() => weightClassFromTonnage(110)).toThrow();
  });
});

describe('allowedRulesLevels', () => {
  it('INTRODUCTORY includes only introductory', () => {
    const allowed = allowedRulesLevels('INTRODUCTORY');
    expect(allowed).toContain('introductory');
    expect(allowed).not.toContain('standard');
    expect(allowed).toHaveLength(1);
  });

  it('STANDARD includes introductory + standard', () => {
    const allowed = allowedRulesLevels('STANDARD');
    expect(allowed).toContain('introductory');
    expect(allowed).toContain('standard');
    expect(allowed).not.toContain('advanced');
    expect(allowed).toHaveLength(2);
  });

  it('ADVANCED includes introductory + standard + advanced', () => {
    const allowed = allowedRulesLevels('ADVANCED');
    expect(allowed).toContain('introductory');
    expect(allowed).toContain('standard');
    expect(allowed).toContain('advanced');
    expect(allowed).not.toContain('experimental');
    expect(allowed).toHaveLength(3);
  });

  it('EXPERIMENTAL includes all 4 standard levels', () => {
    const allowed = allowedRulesLevels('EXPERIMENTAL');
    expect(allowed).toHaveLength(4);
    expect(allowed).not.toContain('unofficial');
  });

  it('UNOFFICIAL includes everything', () => {
    const allowed = allowedRulesLevels('UNOFFICIAL');
    expect(allowed).toHaveLength(5);
    expect(allowed).toContain('unofficial');
  });
});
