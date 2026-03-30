import type { PipImageLoader } from '@bt-roster/record-sheet'

const S3_BASE = 'https://resources.battledroids.ru/roster/'

const templateCache = new Map<string, string>()
const chartCache = new Map<string, string>()
const pipCache = new Map<string, string>()

async function fetchAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Failed to read blob from ${url}`))
    reader.readAsDataURL(blob)
  })
}

export async function fetchTemplateImage(config: string = 'Biped'): Promise<string> {
  const cached = templateCache.get(config)
  if (cached) return cached
  const filename = config === 'Quad' ? 'RS_TW_QD.png' : 'RS_TW_BP.png'
  const data = await fetchAsBase64(`${S3_BASE}templates/${filename}`)
  templateCache.set(config, data)
  return data
}

export async function fetchChartImage(config: string = 'Biped'): Promise<string> {
  const cached = chartCache.get(config)
  if (cached) return cached
  const filename = config === 'Quad' ? 'ChartsQD.png' : 'Charts.png'
  const data = await fetchAsBase64(`${S3_BASE}templates/${filename}`)
  chartCache.set(config, data)
  return data
}

export async function prefetchPipImages(filenames: string[]): Promise<void> {
  const missing = filenames.filter(f => !pipCache.has(f))
  await Promise.all(
    missing.map(async (filename) => {
      const data = await fetchAsBase64(`${S3_BASE}patterns/${filename}`)
      pipCache.set(filename, data)
    })
  )
}

export function createPipImageLoader(): PipImageLoader {
  return (filename: string) => pipCache.get(filename) ?? null
}

export function clearCache(): void {
  templateCache.clear()
  chartCache.clear()
  pipCache.clear()
}
