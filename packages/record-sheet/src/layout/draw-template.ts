/**
 * Draws the record sheet template PNG as the page background.
 */
import type { jsPDF } from 'jspdf';
import { CANVAS } from '../points/print-consts.js';

/**
 * Draw the template image onto the PDF page.
 * @param doc jsPDF instance
 * @param imageData Base64 or data URL of the template PNG
 */
export function drawTemplate(doc: jsPDF, imageData: string): void {
  doc.addImage(imageData, 'PNG', 0, 0, CANVAS.width, CANVAS.height);
}
