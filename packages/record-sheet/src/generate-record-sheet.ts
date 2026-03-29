/**
 * Main entry point for record sheet PDF generation.
 * Composes all layout renderers onto a jsPDF document.
 */
import { jsPDF } from 'jspdf';
import { CANVAS } from './points/print-consts.js';
import { drawTemplate } from './layout/draw-template.js';
import { drawPips } from './layout/draw-pips.js';
import type { PipImageLoader } from './layout/draw-pips.js';
import { drawCriticals } from './layout/draw-crits.js';
import { drawMechData } from './layout/draw-mech-data.js';
import { drawHeat } from './layout/draw-heat.js';
import { beginPageMargin, endPageMargin, beginChartScale, drawChartOverlay } from './layout/draw-charts.js';
import type { RecordSheetData } from './record-sheet-data.js';

export interface GenerateOptions {
  /** Template image as base64 data URL or raw base64 string */
  templateImage: string;
  /** Loader for pip pattern images: given a filename like "TW_BP_CT_12.png",
   *  returns a base64 data URL or null if not found. */
  pipImageLoader: PipImageLoader;
  /** Paper format */
  format?: 'letter' | 'a4';
  /** Optional chart overlay image (base64 data URL, PNG with alpha).
   *  When provided, the record sheet is scaled to 80% and the chart
   *  is composited at full size on the same page (matching SSW). */
  chartImage?: string;
}

/**
 * Render one record sheet page (with optional chart overlay).
 */
function renderSheet(
  doc: jsPDF,
  data: RecordSheetData,
  options: GenerateOptions,
): void {
  const hasCharts = !!options.chartImage;

  if (hasCharts) {
    beginPageMargin(doc);
    beginChartScale(doc);
  }

  drawTemplate(doc, options.templateImage);
  drawPips(doc, data, options.pipImageLoader);
  drawCriticals(doc, data);
  drawMechData(doc, data);
  drawHeat(doc, data);

  if (hasCharts) {
    drawChartOverlay(doc, options.chartImage!);
    endPageMargin(doc);
  }
}

/**
 * Generate a single-page record sheet PDF.
 * Returns the PDF as a Uint8Array.
 */
export function generateRecordSheet(
  data: RecordSheetData,
  options: GenerateOptions,
): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [CANVAS.width, CANVAS.height],
    hotfixes: ['px_scaling'],
  });

  renderSheet(doc, data, options);

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

/**
 * Generate a multi-page PDF with one record sheet per mech.
 */
export function generateMultiRecordSheet(
  sheets: RecordSheetData[],
  options: GenerateOptions,
): Uint8Array {
  if (sheets.length === 0) {
    throw new Error('No record sheets to generate');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [CANVAS.width, CANVAS.height],
    hotfixes: ['px_scaling'],
  });

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) doc.addPage([CANVAS.width, CANVAS.height]);
    renderSheet(doc, sheets[i], options);
  }

  return doc.output('arraybuffer') as unknown as Uint8Array;
}
