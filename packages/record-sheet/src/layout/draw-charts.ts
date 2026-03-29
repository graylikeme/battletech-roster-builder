/**
 * Composites a transparent chart overlay onto the current page.
 *
 * SSW's approach: scale the record sheet to 80%, then overlay the chart PNG
 * (which has alpha transparency) at full size on the same page. The chart
 * tables (hit location, to-hit modifiers, etc.) appear in the margins
 * created by the 80% scaling.
 */
import type { jsPDF } from 'jspdf';
import { CANVAS } from '../points/print-consts.js';

/** Scale factor applied to the record sheet when charts are enabled (matches SSW). */
export const CHART_SCALE = 0.8;

/** Print margin in px on all sides. */
const PAGE_MARGIN = 15;

/**
 * Apply print-margin transform so the entire composition is inset from page edges.
 * Must be closed with {@link endPageMargin} after all page content is drawn.
 */
export function beginPageMargin(doc: jsPDF): void {
  const k = (doc as any).internal.scaleFactor as number;
  const s = (CANVAS.width - 2 * PAGE_MARGIN) / CANVAS.width;
  const tx = PAGE_MARGIN * k;
  const ty = (CANVAS.height * (1 - s) - PAGE_MARGIN) * k;

  doc.saveGraphicsState();
  doc.internal.write(`${s.toFixed(6)} 0 0 ${s.toFixed(6)} ${tx.toFixed(4)} ${ty.toFixed(4)} cm`);
}

/**
 * Restore graphics state after page margin.
 */
export function endPageMargin(doc: jsPDF): void {
  doc.restoreGraphicsState();
}

/**
 * Apply 0.8x scale transform so the record sheet fits alongside charts.
 * Must be paired with {@link drawChartOverlay} after all record sheet content is drawn.
 */
export function beginChartScale(doc: jsPDF): void {
  // PDF origin is bottom-left (y up), but we need to scale from the visual
  // top-left like Java's Graphics2D.  Translate y by (1-s)*pageHeight so
  // the content stays anchored to the top of the page.
  const k = (doc as any).internal.scaleFactor as number;
  const ty = CANVAS.height * k * (1 - CHART_SCALE);

  doc.saveGraphicsState();
  doc.internal.write(`${CHART_SCALE} 0 0 ${CHART_SCALE} 0 ${ty.toFixed(4)} cm`);
}

/**
 * Restore scale and draw the chart overlay at full size on the current page.
 */
export function drawChartOverlay(doc: jsPDF, chartImage: string): void {
  doc.restoreGraphicsState();
  doc.addImage(chartImage, 'PNG', 0, 0, CANVAS.width, CANVAS.height, 'chart', 'FAST');
}
