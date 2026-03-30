/**
 * Draws armor and internal structure pips using SSW's canon pip pattern images.
 *
 * Each body location + armor count has a pre-rendered PNG image showing pips
 * evenly spread across the body region. These were extracted from SSW's
 * patterns.zip (BSD-licensed).
 *
 * Right-side locations reuse left-side images, mirrored horizontally at
 * render time (matching SSW's negative-width drawImage approach).
 *
 * PIPSettings from SSW's PIPPrinter.java define the bounding box for where
 * each image is placed on the record sheet.
 */
import type { jsPDF } from 'jspdf';
import type { RecordSheetData, MechLocation } from '../record-sheet-data.js';

// ---------------------------------------------------------------------------
// PIPSettings from SSW PIPPrinter.java lines 106-125
// ---------------------------------------------------------------------------

interface PipRegion {
  /** File prefix for the pattern image (e.g., "CT_", "LT_") */
  prefix: string;
  /** Top-left x of image placement */
  x: number;
  /** Top-left y of image placement */
  y: number;
  /** Width to draw the image at (absolute value) */
  w: number;
  /** Height to draw the image at */
  h: number;
  /** If true, mirror the image horizontally (right-side locations) */
  mirror: boolean;
}

// Armor regions -- right-side entries reuse left-side prefix with mirror=true
const ARMOR_REGIONS: Record<string, PipRegion> = {
  head:              { prefix: 'HD_',  x: 463, y: 52,  w: 17, h: 20,  mirror: false },
  center_torso:      { prefix: 'CT_',  x: 457, y: 84,  w: 28, h: 88,  mirror: false },
  left_torso:        { prefix: 'LT_',  x: 422, y: 66,  w: 32, h: 86,  mirror: false },
  right_torso:       { prefix: 'LT_',  x: 520, y: 66,  w: 32, h: 86,  mirror: true },
  left_arm:          { prefix: 'LA_',  x: 387, y: 55,  w: 30, h: 98,  mirror: false },
  right_arm:         { prefix: 'LA_',  x: 556, y: 55,  w: 30, h: 98,  mirror: true },
  left_leg:          { prefix: 'LL_',  x: 400, y: 160, w: 51, h: 125, mirror: false },
  right_leg:         { prefix: 'LL_',  x: 542, y: 160, w: 51, h: 125, mirror: true },
  center_torso_rear: { prefix: 'CTR_', x: 460, y: 283, w: 23, h: 70,  mirror: false },
  left_torso_rear:   { prefix: 'LTR_', x: 423, y: 297, w: 30, h: 38,  mirror: false },
  right_torso_rear:  { prefix: 'LTR_', x: 520, y: 297, w: 30, h: 38,  mirror: true },
};

// Internal structure regions
const INTERNAL_REGIONS: Record<string, PipRegion> = {
  head:         { prefix: 'INT_HD_', x: 452, y: 389, w: 13, h: 13, mirror: false },
  center_torso: { prefix: 'INT_CT_', x: 450, y: 410, w: 17, h: 61, mirror: false },
  left_torso:   { prefix: 'INT_LT_', x: 426, y: 401, w: 21, h: 59, mirror: false },
  right_torso:  { prefix: 'INT_LT_', x: 490, y: 401, w: 21, h: 59, mirror: true },
  left_arm:     { prefix: 'INT_LA_', x: 402, y: 400, w: 14, h: 75, mirror: false },
  right_arm:    { prefix: 'INT_LA_', x: 514, y: 400, w: 14, h: 75, mirror: true },
  left_leg:     { prefix: 'INT_LL_', x: 418, y: 463, w: 25, h: 89, mirror: false },
  right_leg:    { prefix: 'INT_LL_', x: 498, y: 463, w: 25, h: 89, mirror: true },
};

export type PipImageLoader = (filename: string) => string | null;

function padNumber(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Draw a pip pattern image, optionally mirrored horizontally.
 *
 * SSW mirrors right-side images using negative width in Java's drawImage().
 * In jsPDF we achieve the same by applying a horizontal flip transform:
 *   1. Save graphics state
 *   2. Translate so the mirror axis is at the image center
 *   3. Scale x by -1
 *   4. Draw the image at the adjusted position
 *   5. Restore graphics state
 */
function drawPipImage(
  doc: jsPDF,
  loader: PipImageLoader,
  region: PipRegion,
  count: number,
): void {
  if (count <= 0) return;
  const filename = `TW_BP_${region.prefix}${padNumber(count)}.png`;
  const imageData = loader(filename);
  if (!imageData) return;

  // Use filename as alias so jsPDF deduplicates mirrored left/right images
  const alias = filename;

  if (region.mirror) {
    // jsPDF internal scale factor converts px to PDF points
    const k = (doc as any).internal.scaleFactor as number;
    const px = region.x * k;

    doc.saveGraphicsState();
    // Flip horizontally around the left edge of the placement area:
    // translate to startX, flip, then translate back.
    // In PDF: the image at x draws at (startX - w) after flip,
    // so we translate by (2*startX - w) to position it correctly.
    // SSW's convention: startX is the RIGHT edge for mirrored images,
    // so the image spans from (startX - w) to startX.
    doc.internal.write(
      `${-1} 0 0 1 ${(2 * px).toFixed(4)} 0 cm`,
    );
    doc.addImage(imageData, 'PNG', region.x, region.y, region.w, region.h, alias, 'FAST');
    doc.restoreGraphicsState();
  } else {
    doc.addImage(imageData, 'PNG', region.x, region.y, region.w, region.h, alias, 'FAST');
  }
}

/**
 * Compute the list of pip pattern filenames needed to render a record sheet.
 * Returns deduplicated filenames (right-side locations reuse left-side images).
 */
export function getRequiredPipFilenames(data: RecordSheetData): string[] {
  const filenames = new Set<string>();

  // Front armor
  for (const loc of ['head', 'center_torso', 'left_torso', 'right_torso',
                      'left_arm', 'right_arm', 'left_leg', 'right_leg'] as MechLocation[]) {
    const armor = data.armorByLocation.get(loc);
    if (!armor || armor.front <= 0) continue;
    const region = ARMOR_REGIONS[loc];
    if (region) filenames.add(`TW_BP_${region.prefix}${padNumber(armor.front)}.png`);
  }

  // Rear armor
  for (const loc of ['center_torso', 'left_torso', 'right_torso'] as MechLocation[]) {
    const armor = data.armorByLocation.get(loc);
    if (!armor?.rear || armor.rear <= 0) continue;
    const rearKey = `${loc}_rear`;
    const region = ARMOR_REGIONS[rearKey];
    if (region) filenames.add(`TW_BP_${region.prefix}${padNumber(armor.rear)}.png`);
  }

  // Internal structure
  for (const loc of ['head', 'center_torso', 'left_torso', 'right_torso',
                      'left_arm', 'right_arm', 'left_leg', 'right_leg'] as MechLocation[]) {
    const structure = data.structureByLocation.get(loc);
    if (!structure || structure <= 0) continue;
    const region = INTERNAL_REGIONS[loc];
    if (region) filenames.add(`TW_BP_${region.prefix}${padNumber(structure)}.png`);
  }

  return [...filenames];
}

export function drawPips(
  doc: jsPDF,
  data: RecordSheetData,
  loader: PipImageLoader,
): void {
  // Armor pips (front)
  for (const loc of ['head', 'center_torso', 'left_torso', 'right_torso',
                      'left_arm', 'right_arm', 'left_leg', 'right_leg'] as MechLocation[]) {
    const armor = data.armorByLocation.get(loc);
    if (!armor || armor.front <= 0) continue;
    const region = ARMOR_REGIONS[loc];
    if (region) drawPipImage(doc, loader, region, armor.front);
  }

  // Armor pips (rear)
  for (const loc of ['center_torso', 'left_torso', 'right_torso'] as MechLocation[]) {
    const armor = data.armorByLocation.get(loc);
    if (!armor?.rear || armor.rear <= 0) continue;
    const rearKey = `${loc}_rear`;
    const region = ARMOR_REGIONS[rearKey];
    if (region) drawPipImage(doc, loader, region, armor.rear);
  }

  // Internal structure pips
  for (const loc of ['head', 'center_torso', 'left_torso', 'right_torso',
                      'left_arm', 'right_arm', 'left_leg', 'right_leg'] as MechLocation[]) {
    const structure = data.structureByLocation.get(loc);
    if (!structure || structure <= 0) continue;
    const region = INTERNAL_REGIONS[loc];
    if (region) drawPipImage(doc, loader, region, structure);
  }
}
