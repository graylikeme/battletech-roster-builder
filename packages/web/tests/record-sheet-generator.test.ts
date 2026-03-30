import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the record-sheet-assets module
vi.mock('../src/services/record-sheet-assets', () => ({
  fetchTemplateImage: vi.fn().mockResolvedValue('data:image/png;base64,template'),
  fetchChartImage: vi.fn().mockResolvedValue('data:image/png;base64,chart'),
  prefetchPipImages: vi.fn().mockResolvedValue(undefined),
  createPipImageLoader: vi.fn().mockReturnValue(() => 'data:image/png;base64,pip'),
}))

// Mock the record-sheet package
vi.mock('@bt-roster/record-sheet', () => ({
  buildRecordSheetData: vi.fn().mockResolvedValue({
    mechName: 'Atlas AS7-D',
    config: 'Biped',
    armorByLocation: new Map(),
    structureByLocation: new Map(),
  }),
  getRequiredPipFilenames: vi.fn().mockReturnValue(['TW_BP_CT_12.png']),
  generateRecordSheet: vi.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])), // %PDF
  generateMultiRecordSheet: vi.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])),
}))

import {
  generateSingleSheetPdf,
  generateRosterSheetsPdf,
  downloadPdfBlob,
  openPdfForPrint,
} from '../src/services/record-sheet-generator'
import { fetchTemplateImage, fetchChartImage, prefetchPipImages, createPipImageLoader } from '../src/services/record-sheet-assets'
import { buildRecordSheetData, getRequiredPipFilenames, generateRecordSheet, generateMultiRecordSheet } from '@bt-roster/record-sheet'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateSingleSheetPdf', () => {
  it('builds data, prefetches assets, and generates PDF', async () => {
    const pdf = await generateSingleSheetPdf('atlas-as7-d', { gunnery: 3, piloting: 4 })

    expect(buildRecordSheetData).toHaveBeenCalledWith('atlas-as7-d', { gunnery: 3, piloting: 4 })
    expect(getRequiredPipFilenames).toHaveBeenCalled()
    expect(prefetchPipImages).toHaveBeenCalledWith(['TW_BP_CT_12.png'])
    expect(fetchTemplateImage).toHaveBeenCalledWith('Biped')
    expect(fetchChartImage).toHaveBeenCalledWith('Biped')
    expect(generateRecordSheet).toHaveBeenCalled()
    expect(pdf).toBeInstanceOf(Uint8Array)
  })
})

describe('generateRosterSheetsPdf', () => {
  it('builds data for each entry and generates multi-page PDF', async () => {
    const entries = [
      { slug: 'atlas-as7-d', gunnery: 4, piloting: 5 },
      { slug: 'locust-lct-1v', gunnery: 3, piloting: 4 },
    ]

    const pdf = await generateRosterSheetsPdf(entries)

    expect(buildRecordSheetData).toHaveBeenCalledTimes(2)
    expect(buildRecordSheetData).toHaveBeenCalledWith('atlas-as7-d', { gunnery: 4, piloting: 5 })
    expect(buildRecordSheetData).toHaveBeenCalledWith('locust-lct-1v', { gunnery: 3, piloting: 4 })
    expect(generateMultiRecordSheet).toHaveBeenCalled()
    expect(pdf).toBeInstanceOf(Uint8Array)
  })

  it('calls progress callback for each entry', async () => {
    const entries = [
      { slug: 'atlas-as7-d', gunnery: 4, piloting: 5 },
      { slug: 'locust-lct-1v', gunnery: 3, piloting: 4 },
    ]
    const onProgress = vi.fn()

    await generateRosterSheetsPdf(entries, onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 2)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })
})

describe('downloadPdfBlob', () => {
  it('creates blob URL and triggers download', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    })

    const clickSpy = vi.fn()
    const fakeAnchor = { href: '', download: '', click: clickSpy }
    Object.defineProperty(globalThis, 'document', {
      value: { createElement: vi.fn().mockReturnValue(fakeAnchor) },
      writable: true,
    })

    downloadPdfBlob(new Uint8Array([37, 80, 68, 70]), 'test.pdf')

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(fakeAnchor.download).toBe('test.pdf')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})

describe('openPdfForPrint', () => {
  it('opens PDF in new window', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL: vi.fn() },
      writable: true,
    })
    const openSpy = vi.fn()
    Object.defineProperty(globalThis, 'window', {
      value: { open: openSpy },
      writable: true,
    })

    openPdfForPrint(new Uint8Array([37, 80, 68, 70]))

    expect(createObjectURL).toHaveBeenCalled()
    expect(openSpy).toHaveBeenCalledWith('blob:test', '_blank')
  })
})
