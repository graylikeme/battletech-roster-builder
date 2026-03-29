/**
 * Generate a test record sheet PDF for a given mech.
 * Usage: npx tsx packages/record-sheet/scripts/generate-test-sheet.ts [slug]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRecordSheetData } from '../src/record-sheet-data.js';
import { generateRecordSheet } from '../src/generate-record-sheet.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, '..', 'assets');
const patternsDir = resolve(assetsDir, 'patterns');

function createPipImageLoader() {
  const cache = new Map<string, string | null>();

  return (filename: string): string | null => {
    if (cache.has(filename)) return cache.get(filename)!;

    const filepath = resolve(patternsDir, filename);
    if (!existsSync(filepath)) {
      cache.set(filename, null);
      return null;
    }

    const buffer = readFileSync(filepath);
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
    cache.set(filename, dataUrl);
    return dataUrl;
  };
}

async function main() {
  const slug = process.argv[2] ?? 'assassin-asn-21';
  console.log(`Fetching data for ${slug}...`);

  const data = await buildRecordSheetData(slug, {
    pilotName: '',
    gunnery: 4,
    piloting: 5,
  });

  console.log(`  ${data.mechName} (${data.tonnage}t, BV ${data.bv})`);
  console.log(`  Weapons: ${data.weapons.map(w => w.name).join(', ')}`);
  console.log(`  Armor total: ${data.totalArmor}`);
  console.log(`  Heat sinks: ${data.heatSinkCount} ${data.heatSinkType}`);

  // Load template image
  const templatePath = resolve(assetsDir, 'RS_TW_BP.png');
  const templateBuffer = readFileSync(templatePath);
  const templateBase64 = `data:image/png;base64,${templateBuffer.toString('base64')}`;

  // Load chart image
  const chartPath = resolve(assetsDir, 'Charts.png');
  const chartBuffer = readFileSync(chartPath);
  const chartBase64 = `data:image/png;base64,${chartBuffer.toString('base64')}`;

  console.log('Generating PDF...');
  const pdfBytes = generateRecordSheet(data, {
    templateImage: templateBase64,
    pipImageLoader: createPipImageLoader(),
    chartImage: chartBase64,
  });

  const outPath = resolve(__dirname, '..', `${slug}.pdf`);
  writeFileSync(outPath, Buffer.from(pdfBytes));
  console.log(`Written to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
