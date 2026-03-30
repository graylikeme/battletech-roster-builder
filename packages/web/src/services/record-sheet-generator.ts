import {
  buildRecordSheetData,
  getRequiredPipFilenames,
  generateRecordSheet,
  generateMultiRecordSheet,
} from '@bt-roster/record-sheet'
import type { GenerateOptions } from '@bt-roster/record-sheet'
import {
  fetchTemplateImage,
  fetchChartImage,
  prefetchPipImages,
  createPipImageLoader,
} from './record-sheet-assets'

export interface SheetEntry {
  slug: string
  gunnery?: number
  piloting?: number
}

async function prepareAssets(config: string, pipFilenames: string[]): Promise<GenerateOptions> {
  const [templateImage, chartImage] = await Promise.all([
    fetchTemplateImage(config),
    fetchChartImage(config),
    prefetchPipImages(pipFilenames),
  ])
  return {
    templateImage,
    chartImage,
    pipImageLoader: createPipImageLoader(),
  }
}

export async function generateSingleSheetPdf(
  slug: string,
  opts: { gunnery?: number; piloting?: number } = {},
): Promise<Uint8Array> {
  const data = await buildRecordSheetData(slug, opts)
  const pipFilenames = getRequiredPipFilenames(data)
  const options = await prepareAssets(data.config, pipFilenames)
  return generateRecordSheet(data, options)
}

export async function generateRosterSheetsPdf(
  entries: SheetEntry[],
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array> {
  const sheets = []
  const allPipFilenames = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    const { slug, gunnery, piloting } = entries[i]
    const data = await buildRecordSheetData(slug, { gunnery, piloting })
    for (const f of getRequiredPipFilenames(data)) allPipFilenames.add(f)
    sheets.push(data)
    onProgress?.(i + 1, entries.length)
  }

  const config = sheets[0]?.config ?? 'Biped'
  const options = await prepareAssets(config, [...allPipFilenames])
  return generateMultiRecordSheet(sheets, options)
}

export function downloadPdfBlob(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function openPdfForPrint(pdfBytes: Uint8Array): void {
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
