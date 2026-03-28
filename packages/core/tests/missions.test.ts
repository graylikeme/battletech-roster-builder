import { describe, it, expect } from 'vitest';
import { MISSION_PROFILES, assignSlots, type MissionProfile } from '../src/missions.js';
import type { Mission } from '../src/models.js';

describe('MISSION_PROFILES', () => {
  it('defines all 8 missions', () => {
    const missions: Mission[] = [
      'pitched_battle', 'recon', 'objective_raid', 'defense',
      'escort', 'extraction', 'breakthrough', 'zone_control',
    ];
    for (const m of missions) {
      expect(MISSION_PROFILES[m]).toBeDefined();
      expect(MISSION_PROFILES[m].name).toBeTruthy();
      expect(MISSION_PROFILES[m].description).toBeTruthy();
    }
  });

  it('role weights sum to ~1.0 for each mission', () => {
    for (const [mission, profile] of Object.entries(MISSION_PROFILES)) {
      const sum = Object.values(profile.roleWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });

  it('weight distribution sums to ~1.0 for each mission', () => {
    for (const [mission, profile] of Object.entries(MISSION_PROFILES)) {
      const sum = Object.values(profile.weightDistribution).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });

  it('defense has no LIGHT weight class', () => {
    expect(MISSION_PROFILES.defense.weightDistribution.LIGHT).toBeUndefined();
  });

  it('zone_control has no LIGHT weight class', () => {
    expect(MISSION_PROFILES.zone_control.weightDistribution.LIGHT).toBeUndefined();
  });

  it('pitched_battle has no LIGHT weight class', () => {
    expect(MISSION_PROFILES.pitched_battle.weightDistribution.LIGHT).toBeUndefined();
  });

  it('breakthrough has no LIGHT weight class', () => {
    expect(MISSION_PROFILES.breakthrough.weightDistribution.LIGHT).toBeUndefined();
  });

  it('recon includes LIGHT weight class', () => {
    expect(MISSION_PROFILES.recon.weightDistribution.LIGHT).toBeGreaterThan(0);
  });
});

describe('assignSlots', () => {
  it('returns exactly the requested count of slots', () => {
    for (const count of [3, 4, 5, 6, 8]) {
      const slots = assignSlots('pitched_battle', count, 8000);
      expect(slots).toHaveLength(count);
    }
  });

  it('slot BV targets sum to the budget', () => {
    const slots = assignSlots('defense', 4, 10000);
    const sum = slots.reduce((a, s) => a + s.bvTarget, 0);
    expect(sum).toBe(10000);
  });

  it('defense slots have no LIGHT weight class', () => {
    const slots = assignSlots('defense', 6, 12000);
    for (const slot of slots) {
      expect(slot.weightClass).not.toBe('LIGHT');
    }
  });

  it('recon slots are mostly LIGHT/MEDIUM', () => {
    const slots = assignSlots('recon', 4, 4000);
    const lightMedium = slots.filter(s => s.weightClass === 'LIGHT' || s.weightClass === 'MEDIUM');
    expect(lightMedium.length).toBeGreaterThanOrEqual(3);
  });

  it('slots are sorted heaviest first', () => {
    const weightOrder = { ASSAULT: 0, HEAVY: 1, MEDIUM: 2, LIGHT: 3 };
    const slots = assignSlots('pitched_battle', 4, 8000);
    for (let i = 1; i < slots.length; i++) {
      expect(weightOrder[slots[i].weightClass]).toBeGreaterThanOrEqual(
        weightOrder[slots[i - 1].weightClass]
      );
    }
  });

  it('assault slots get higher BV targets than medium slots', () => {
    const slots = assignSlots('defense', 4, 10000);
    const assaultSlots = slots.filter(s => s.weightClass === 'ASSAULT');
    const mediumSlots = slots.filter(s => s.weightClass === 'MEDIUM');
    if (assaultSlots.length > 0 && mediumSlots.length > 0) {
      expect(assaultSlots[0].bvTarget).toBeGreaterThan(mediumSlots[0].bvTarget);
    }
  });

  it('each slot has a role from the mission profile', () => {
    const slots = assignSlots('defense', 4, 10000);
    const profileRoles = Object.keys(MISSION_PROFILES.defense.roleWeights);
    for (const slot of slots) {
      expect(profileRoles).toContain(slot.role);
    }
  });
});
