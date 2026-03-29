/**
 * Draws heat sink pips and labels.
 * Mirrors SSW's heat sink rendering in DrawMechData().
 */
import type { jsPDF } from 'jspdf';
import { BIPED_POINTS } from '../points/biped-points.js';
import { FONTS, DATA, PIP } from '../points/print-consts.js';
import type { RecordSheetData } from '../record-sheet-data.js';

export function drawHeat(doc: jsPDF, data: RecordSheetData): void {
  const d = BIPED_POINTS.data;
  const hsPoints = BIPED_POINTS.heatSinks;

  // Draw heat sink pips (hollow circles, 7px diameter)
  doc.setLineWidth(PIP.strokeWidth);
  doc.setDrawColor(0);

  const count = Math.min(data.heatSinkCount, hsPoints.length);
  for (let i = 0; i < count; i++) {
    const p = hsPoints[i];
    const cx = p.x + PIP.heatSinkSize / 2;
    const cy = p.y + PIP.heatSinkSize / 2;
    const r = PIP.heatSinkSize / 2;
    doc.ellipse(cx, cy, r, r, 'S');
  }

  // Heat sink number and type label
  doc.setFont(FONTS.small.family, FONTS.small.style);
  doc.setFontSize(FONTS.small.size);
  doc.setTextColor(0);

  const hsNum = d[DATA.HEATSINK_NUMBER];
  const isDouble = data.heatSinkType.toLowerCase().includes('double');

  let label = String(data.heatSinkCount);
  if (data.heatDissipation !== data.heatSinkCount) {
    label = `${data.heatSinkCount} [${data.heatDissipation}]`;
  }
  doc.text(label, hsNum.x, hsNum.y + 4);

  // Type label below
  const typeStr = isDouble ? 'Double' : 'Single';
  doc.text(typeStr, hsNum.x + 2, hsNum.y + 12);
}
