import { useState, useCallback } from 'react'
import {
  generateSingleSheetPdf,
  generateRosterSheetsPdf,
  downloadPdfBlob,
  openPdfForPrint,
  type SheetEntry,
} from '@/services/record-sheet-generator'

interface Progress {
  current: number
  total: number
}

export function useRecordSheet() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadSingle = useCallback(async (
    slug: string,
    opts: { gunnery?: number; piloting?: number } = {},
    filename?: string,
  ) => {
    setIsGenerating(true)
    setError(null)
    try {
      const pdf = await generateSingleSheetPdf(slug, opts)
      downloadPdfBlob(pdf, filename ?? `${slug}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const printSingle = useCallback(async (
    slug: string,
    opts: { gunnery?: number; piloting?: number } = {},
  ) => {
    setIsGenerating(true)
    setError(null)
    try {
      const pdf = await generateSingleSheetPdf(slug, opts)
      openPdfForPrint(pdf)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const downloadRoster = useCallback(async (
    entries: SheetEntry[],
    filename?: string,
  ) => {
    setIsGenerating(true)
    setProgress({ current: 0, total: entries.length })
    setError(null)
    try {
      const pdf = await generateRosterSheetsPdf(entries, (current, total) => {
        setProgress({ current, total })
      })
      downloadPdfBlob(pdf, filename ?? 'record-sheets.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }, [])

  const printRoster = useCallback(async (entries: SheetEntry[]) => {
    setIsGenerating(true)
    setProgress({ current: 0, total: entries.length })
    setError(null)
    try {
      const pdf = await generateRosterSheetsPdf(entries, (current, total) => {
        setProgress({ current, total })
      })
      openPdfForPrint(pdf)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }, [])

  return {
    downloadSingle,
    printSingle,
    downloadRoster,
    printRoster,
    isGenerating,
    progress,
    error,
  }
}
