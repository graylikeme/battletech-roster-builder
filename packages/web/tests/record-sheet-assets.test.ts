import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchTemplateImage,
  fetchChartImage,
  prefetchPipImages,
  createPipImageLoader,
  clearCache,
} from '../src/services/record-sheet-assets'

const FAKE_BASE64 = 'data:image/png;base64,iVBORw0KGgo='

// Mock fetch globally
const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true })

function mockFetchResponse() {
  const blob = new Blob(['fake-image-data'], { type: 'image/png' })
  mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) })
}

// Mock FileReader to return a predictable data URL
class MockFileReader {
  result: string | null = null
  onload: (() => void) | null = null
  readAsDataURL(_blob: Blob) {
    this.result = FAKE_BASE64
    setTimeout(() => this.onload?.(), 0)
  }
}
Object.defineProperty(globalThis, 'FileReader', { value: MockFileReader, writable: true })

beforeEach(() => {
  vi.clearAllMocks()
  clearCache()
})

describe('fetchTemplateImage', () => {
  it('fetches biped template from S3', async () => {
    mockFetchResponse()
    const result = await fetchTemplateImage('Biped')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('templates/RS_TW_BP.png')
    )
    expect(result).toBe(FAKE_BASE64)
  })

  it('fetches quad template from S3', async () => {
    mockFetchResponse()
    await fetchTemplateImage('Quad')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('templates/RS_TW_QD.png')
    )
  })

  it('caches template across calls', async () => {
    mockFetchResponse()
    await fetchTemplateImage('Biped')
    await fetchTemplateImage('Biped')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('fetchChartImage', () => {
  it('fetches biped chart from S3', async () => {
    mockFetchResponse()
    const result = await fetchChartImage('Biped')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('templates/Charts.png')
    )
    expect(result).toBe(FAKE_BASE64)
  })

  it('caches chart across calls', async () => {
    mockFetchResponse()
    await fetchChartImage('Biped')
    await fetchChartImage('Biped')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('prefetchPipImages', () => {
  it('fetches all provided filenames', async () => {
    mockFetchResponse()
    await prefetchPipImages(['TW_BP_CT_12.png', 'TW_BP_HD_08.png'])
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('patterns/TW_BP_CT_12.png')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('patterns/TW_BP_HD_08.png')
    )
  })

  it('skips already-cached pip images', async () => {
    mockFetchResponse()
    await prefetchPipImages(['TW_BP_CT_12.png'])
    mockFetch.mockClear()
    await prefetchPipImages(['TW_BP_CT_12.png', 'TW_BP_HD_08.png'])
    // Only the new one should be fetched
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('patterns/TW_BP_HD_08.png')
    )
  })
})

describe('createPipImageLoader', () => {
  it('returns cached image data for known filenames', async () => {
    mockFetchResponse()
    await prefetchPipImages(['TW_BP_CT_12.png'])
    const loader = createPipImageLoader()
    expect(loader('TW_BP_CT_12.png')).toBe(FAKE_BASE64)
  })

  it('returns null for uncached filenames', () => {
    const loader = createPipImageLoader()
    expect(loader('TW_BP_UNKNOWN_99.png')).toBeNull()
  })
})
