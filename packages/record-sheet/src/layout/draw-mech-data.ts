/**
 * Draws mech data text: name, stats, weapons table, pilot, BV, cost, ammo,
 * armor/internal point labels.
 */
import type { jsPDF } from 'jspdf';
import { BIPED_POINTS } from '../points/biped-points.js';
import { FONTS, DATA, WEAPON_COLS, CANVAS } from '../points/print-consts.js';
import type { RecordSheetData } from '../record-sheet-data.js';

function setFont(doc: jsPDF, font: typeof FONTS[keyof typeof FONTS]): void {
  doc.setFont(font.family, font.style);
  doc.setFontSize(font.size);
}

function formatCost(cost: number): string {
  return cost.toLocaleString('en-US') + ' C-Bills';
}

function formatTechBase(techBase: string): string {
  const tb = techBase.toLowerCase();
  if (tb === 'inner_sphere' || tb === 'inner sphere') return 'Inner Sphere';
  if (tb === 'clan') return 'Clan';
  if (tb === 'mixed') return 'Mixed';
  return techBase;
}

// ---------------------------------------------------------------------------
// Mech identity & stats block
// ---------------------------------------------------------------------------

function drawMechStats(doc: jsPDF, data: RecordSheetData): void {
  const d = BIPED_POINTS.data;

  // Mech name
  setFont(doc, FONTS.designName);
  doc.setTextColor(0);
  doc.text(data.mechName, d[DATA.MECH_NAME].x, d[DATA.MECH_NAME].y);

  // Movement points
  setFont(doc, FONTS.small8);
  doc.text(String(data.walkMp), d[DATA.WALK_MP].x, d[DATA.WALK_MP].y);
  doc.text(String(data.runMp), d[DATA.RUN_MP].x, d[DATA.RUN_MP].y);
  doc.text(String(data.jumpMp), d[DATA.JUMP_MP].x, d[DATA.JUMP_MP].y);

  // Tonnage
  setFont(doc, FONTS.plain);
  doc.text(String(data.tonnage), d[DATA.TONNAGE].x, d[DATA.TONNAGE].y);

  // Tech base
  const techStr = formatTechBase(data.techBase);
  doc.text(techStr, d[DATA.TECH_IS].x, d[DATA.TECH_IS].y);

  // BV + Cost -- SSW uses SmallFont (7pt Eurostile ≈ 6pt Helvetica) for both
  setFont(doc, FONTS.small);
  doc.text(String(data.bv), d[DATA.BV2].x, d[DATA.BV2].y);

  if (data.cost != null) {
    doc.text(formatCost(data.cost), d[DATA.COST].x, d[DATA.COST].y);
  }

  // Weapon Heat / Dissipation
  setFont(doc, FONTS.small);
  doc.text(
    `Weapon Heat [${data.totalWeaponHeat}]`,
    d[DATA.MAX_HEAT].x, d[DATA.MAX_HEAT].y - 7,
  );
  doc.text(
    `Dissipation [${data.heatDissipation}]`,
    d[DATA.MAX_HEAT].x, d[DATA.MAX_HEAT].y + 1,
  );

  // Total armor -- right-align to stay within page bounds
  const armorText = `Armor Pts: ${data.totalArmor}`;
  const armorTextWidth = doc.getTextWidth(armorText);
  doc.text(armorText, CANVAS.width - 4 - armorTextWidth, d[DATA.TOTAL_ARMOR].y + 16);
}

// ---------------------------------------------------------------------------
// Pilot data
// ---------------------------------------------------------------------------

function drawPilotData(doc: jsPDF, data: RecordSheetData): void {
  const d = BIPED_POINTS.data;

  setFont(doc, FONTS.plain);
  doc.text(data.pilotName ?? '', d[DATA.PILOT_NAME].x, d[DATA.PILOT_NAME].y);
  doc.text(
    String(data.gunnery ?? 4),
    d[DATA.PILOT_GUN].x, d[DATA.PILOT_GUN].y,
  );
  doc.text(
    String(data.piloting ?? 5),
    d[DATA.PILOT_PILOT].x, d[DATA.PILOT_PILOT].y,
  );
}

// ---------------------------------------------------------------------------
// Weapons & equipment table
// ---------------------------------------------------------------------------

function drawWeaponsTable(doc: jsPDF, data: RecordSheetData): void {
  const w = BIPED_POINTS.weapons;
  const totalLines = data.weapons.length + data.ammo.length;

  // Select font based on density (matches SSW logic)
  if (totalLines >= 20) {
    setFont(doc, FONTS.crazyTiny);
  } else if (totalLines >= 16) {
    setFont(doc, FONTS.tiny);
  } else {
    setFont(doc, FONTS.reallySmall);
  }

  const fontSize = doc.getFontSize();
  let offset = 0;

  // Weapons
  for (const weapon of data.weapons) {
    const y = w[WEAPON_COLS.COUNT].y + offset;
    doc.text(String(weapon.count), w[WEAPON_COLS.COUNT].x + 1, y);
    doc.text(weapon.name, w[WEAPON_COLS.NAME].x - 3, y);
    doc.text(weapon.location, w[WEAPON_COLS.LOCATION].x, y);
    doc.text(weapon.heat, w[WEAPON_COLS.HEAT].x, y);
    doc.text(weapon.damage, w[WEAPON_COLS.DAMAGE].x, y);
    doc.text(weapon.rangeMin, w[WEAPON_COLS.MIN].x, y);
    doc.text(weapon.rangeShort, w[WEAPON_COLS.SHORT].x, y);
    doc.text(weapon.rangeMedium, w[WEAPON_COLS.MEDIUM].x, y);
    doc.text(weapon.rangeLong, w[WEAPON_COLS.LONG].x, y);
    offset += fontSize + 2;
  }

  // Ammo section
  if (data.ammo.length > 0) {
    offset += 2;
    const ammoHeaderY = w[WEAPON_COLS.COUNT].y + offset;
    doc.text('Ammunition Type', w[WEAPON_COLS.COUNT].x, ammoHeaderY);
    doc.text('Rounds', w[WEAPON_COLS.HEAT].x, ammoHeaderY);
    offset += 2;

    // Divider line
    const lineY = w[WEAPON_COLS.COUNT].y + offset;
    doc.setLineWidth(0.5);
    doc.line(
      w[WEAPON_COLS.COUNT].x,
      lineY,
      w[WEAPON_COLS.LONG].x + 8,
      lineY,
    );
    offset += fontSize;

    for (const ammo of data.ammo) {
      const y = w[WEAPON_COLS.COUNT].y + offset;
      doc.text(ammo.name, w[WEAPON_COLS.COUNT].x, y);
      doc.text(String(ammo.rounds), w[WEAPON_COLS.HEAT].x, y);
      offset += fontSize + 2;
    }
  }
}

// ---------------------------------------------------------------------------
// Armor & internal structure point labels near diagrams
// ---------------------------------------------------------------------------

function drawArmorLabels(doc: jsPDF, data: RecordSheetData): void {
  setFont(doc, FONTS.reallySmall);
  const ai = BIPED_POINTS.armorInfo;

  const locs: { idx: number; loc: string; isRear?: boolean }[] = [
    { idx: 0, loc: 'head' },
    { idx: 1, loc: 'center_torso' },
    { idx: 2, loc: 'left_torso' },
    { idx: 3, loc: 'right_torso' },
    { idx: 4, loc: 'left_arm' },
    { idx: 5, loc: 'right_arm' },
    { idx: 6, loc: 'left_leg' },
    { idx: 7, loc: 'right_leg' },
    { idx: 8, loc: 'center_torso', isRear: true },
    { idx: 9, loc: 'left_torso', isRear: true },
    { idx: 10, loc: 'right_torso', isRear: true },
  ];

  for (const { idx, loc, isRear } of locs) {
    const armor = data.armorByLocation.get(loc as any);
    if (!armor) continue;
    const value = isRear ? (armor.rear ?? 0) : armor.front;
    doc.text(`[${value}]`, ai[idx].x, ai[idx].y);
  }
}

function drawInternalLabels(doc: jsPDF, data: RecordSheetData): void {
  setFont(doc, FONTS.reallySmall);
  const ii = BIPED_POINTS.internalInfo;

  const locs: { idx: number; loc: string }[] = [
    // idx 0 is unused (head is at 0,0 in SSW)
    { idx: 1, loc: 'center_torso' },
    { idx: 2, loc: 'left_torso' },
    { idx: 3, loc: 'right_torso' },
    { idx: 4, loc: 'left_arm' },
    { idx: 5, loc: 'right_arm' },
    { idx: 6, loc: 'left_leg' },
    { idx: 7, loc: 'right_leg' },
  ];

  for (const { idx, loc } of locs) {
    const value = data.structureByLocation.get(loc as any);
    if (value == null) continue;
    doc.text(`[${value}]`, ii[idx].x, ii[idx].y);
  }
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export function drawMechData(doc: jsPDF, data: RecordSheetData): void {
  drawMechStats(doc, data);
  drawPilotData(doc, data);
  drawWeaponsTable(doc, data);
  drawArmorLabels(doc, data);
  drawInternalLabels(doc, data);
}
