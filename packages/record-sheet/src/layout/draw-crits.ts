/**
 * Draws critical hit table entries at slot positions.
 * Uses API-provided slot data for authoritative slot assignments.
 */
import type { jsPDF } from 'jspdf';
import { BIPED_POINTS } from '../points/biped-points.js';
import { FONTS } from '../points/print-consts.js';
import type { RecordSheetData, MechLocation, CritSlot } from '../record-sheet-data.js';
import type { Point } from '../points/biped-points.js';

const LOCATION_CRIT_MAP: { loc: MechLocation; key: keyof typeof BIPED_POINTS.crits }[] = [
  { loc: 'head', key: 'head' },
  { loc: 'center_torso', key: 'centerTorso' },
  { loc: 'left_torso', key: 'leftTorso' },
  { loc: 'right_torso', key: 'rightTorso' },
  { loc: 'left_arm', key: 'leftArm' },
  { loc: 'right_arm', key: 'rightArm' },
  { loc: 'left_leg', key: 'leftLeg' },
  { loc: 'right_leg', key: 'rightLeg' },
];

function drawLocationCrits(
  doc: jsPDF,
  slots: CritSlot[],
  points: Point[],
): void {
  // The last point in each array is the CASE position -- skip it for regular slots
  const slotCount = Math.min(slots.length, points.length - 1);

  for (let i = 0; i < slotCount; i++) {
    const slot = slots[i];
    const p = points[i];

    // SSW uses bold for ALL equipment, light gray only for "Roll Again"
    const isRollAgain = slot.name === 'Roll Again';
    if (isRollAgain) {
      doc.setFont(FONTS.nonCrit.family, FONTS.nonCrit.style);
      doc.setFontSize(FONTS.nonCrit.size);
      doc.setTextColor(120); // gray for Roll Again
    } else {
      doc.setFont(FONTS.crit.family, FONTS.crit.style);
      doc.setFontSize(FONTS.crit.size);
      doc.setTextColor(0);
    }

    // Draw text offset 3px right of the point (matches SSW's x+3)
    doc.text(slot.name, p.x + 3, p.y);
  }

  // Reset text color
  doc.setTextColor(0);
}

function drawMultiSlotBrackets(
  doc: jsPDF,
  slots: CritSlot[],
  points: Point[],
): void {
  const slotCount = Math.min(slots.length, points.length - 1);
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);

  let i = 0;
  while (i < slotCount) {
    const name = slots[i].name;
    // Skip non-critable items and single-slot items
    if (!slots[i].isCritable) { i++; continue; }

    // Find contiguous run of same equipment
    let end = i + 1;
    while (end < slotCount && slots[end].name === name && slots[end].isCritable) {
      end++;
    }

    const span = end - i;
    if (span > 1 && !name.includes('Engine') && !name.includes('Gyro')) {
      const topP = points[i];
      const botP = points[end - 1];
      const x = topP.x;

      // Top bracket: horizontal line + vertical start
      doc.line(x, topP.y - 3, x + 2, topP.y - 3);
      // Vertical line spanning all slots
      doc.line(x, topP.y - 3, x, botP.y - 2);
      // Bottom bracket: horizontal line
      doc.line(x, botP.y - 2, x + 2, botP.y - 2);
    }

    i = end;
  }
}

export function drawCriticals(doc: jsPDF, data: RecordSheetData): void {
  for (const { loc, key } of LOCATION_CRIT_MAP) {
    const slots = data.criticalSlots.get(loc);
    if (!slots) continue;
    const points = BIPED_POINTS.crits[key];

    drawLocationCrits(doc, slots, points);
    drawMultiSlotBrackets(doc, slots, points);
  }
}
