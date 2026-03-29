import { describe, it, expect } from 'vitest';
import { BIPED_POINTS } from '../src/points/biped-points.js';
import { CANVAS } from '../src/points/print-consts.js';

describe('BIPED_POINTS', () => {
  it('has data points array of expected length', () => {
    expect(BIPED_POINTS.data).toHaveLength(22);
  });

  it('has weapons column points array of expected length', () => {
    expect(BIPED_POINTS.weapons).toHaveLength(9);
  });

  it('has armor pip arrays for all locations', () => {
    expect(BIPED_POINTS.armor.head.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.centerTorso.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.leftTorso.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.rightTorso.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.leftArm.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.rightArm.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.leftLeg.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.rightLeg.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.centerTorsoRear.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.leftTorsoRear.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.armor.rightTorsoRear.length).toBeGreaterThan(0);
  });

  it('has enough armor pips for max armor values', () => {
    // Max armor values for a 100-ton mech
    expect(BIPED_POINTS.armor.head.length).toBeGreaterThanOrEqual(9);
    expect(BIPED_POINTS.armor.centerTorso.length).toBeGreaterThanOrEqual(47);
    expect(BIPED_POINTS.armor.leftTorso.length).toBeGreaterThanOrEqual(32);
    expect(BIPED_POINTS.armor.leftArm.length).toBeGreaterThanOrEqual(34);
    expect(BIPED_POINTS.armor.leftLeg.length).toBeGreaterThanOrEqual(42);
  });

  it('has internal structure pip arrays for all locations', () => {
    expect(BIPED_POINTS.internal.head.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.centerTorso.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.leftTorso.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.rightTorso.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.leftArm.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.rightArm.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.leftLeg.length).toBeGreaterThan(0);
    expect(BIPED_POINTS.internal.rightLeg.length).toBeGreaterThan(0);
  });

  it('has critical slot arrays for all locations', () => {
    // Head and legs: 6 slots + CASE = 7 points
    expect(BIPED_POINTS.crits.head).toHaveLength(7);
    expect(BIPED_POINTS.crits.leftLeg).toHaveLength(7);
    expect(BIPED_POINTS.crits.rightLeg).toHaveLength(7);

    // Torsos and arms: 12 slots + CASE = 13 points
    expect(BIPED_POINTS.crits.centerTorso).toHaveLength(13);
    expect(BIPED_POINTS.crits.leftTorso).toHaveLength(13);
    expect(BIPED_POINTS.crits.rightTorso).toHaveLength(13);
    expect(BIPED_POINTS.crits.leftArm).toHaveLength(13);
    expect(BIPED_POINTS.crits.rightArm).toHaveLength(13);
  });

  it('has armor info labels for all locations + rear', () => {
    expect(BIPED_POINTS.armorInfo).toHaveLength(11);
  });

  it('has internal info labels', () => {
    expect(BIPED_POINTS.internalInfo).toHaveLength(8);
  });

  it('has heat sink pip positions', () => {
    expect(BIPED_POINTS.heatSinks).toHaveLength(50);
  });

  it('has mech image location and bounds', () => {
    expect(BIPED_POINTS.mechImageLoc).toEqual({ x: 230, y: 162 });
    expect(BIPED_POINTS.mechImageBounds).toEqual({ x: 150, y: 210 });
  });

  it('all coordinates are within canvas bounds', () => {
    const checkPoints = (points: { x: number; y: number }[], label: string) => {
      for (const p of points) {
        expect(p.x, `${label} x=${p.x}`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${label} x=${p.x}`).toBeLessThanOrEqual(CANVAS.width);
        expect(p.y, `${label} y=${p.y}`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${label} y=${p.y}`).toBeLessThanOrEqual(CANVAS.height);
      }
    };

    checkPoints(BIPED_POINTS.data, 'data');
    checkPoints(BIPED_POINTS.weapons, 'weapons');
    checkPoints(BIPED_POINTS.heatSinks, 'heatSinks');
    checkPoints(BIPED_POINTS.armorInfo, 'armorInfo');

    for (const [key, points] of Object.entries(BIPED_POINTS.armor)) {
      checkPoints(points, `armor.${key}`);
    }
    for (const [key, points] of Object.entries(BIPED_POINTS.internal)) {
      checkPoints(points, `internal.${key}`);
    }
    for (const [key, points] of Object.entries(BIPED_POINTS.crits)) {
      checkPoints(points, `crits.${key}`);
    }
  });

  it('left/right armor arrays are mirror images', () => {
    // LT and RT should have the same number of points
    expect(BIPED_POINTS.armor.leftTorso.length).toBe(BIPED_POINTS.armor.rightTorso.length);
    expect(BIPED_POINTS.armor.leftArm.length).toBe(BIPED_POINTS.armor.rightArm.length);
    expect(BIPED_POINTS.armor.leftLeg.length).toBe(BIPED_POINTS.armor.rightLeg.length);
    expect(BIPED_POINTS.armor.leftTorsoRear.length).toBe(BIPED_POINTS.armor.rightTorsoRear.length);

    // Internal structure symmetry
    expect(BIPED_POINTS.internal.leftTorso.length).toBe(BIPED_POINTS.internal.rightTorso.length);
    expect(BIPED_POINTS.internal.leftArm.length).toBe(BIPED_POINTS.internal.rightArm.length);
    expect(BIPED_POINTS.internal.leftLeg.length).toBe(BIPED_POINTS.internal.rightLeg.length);
  });
});
