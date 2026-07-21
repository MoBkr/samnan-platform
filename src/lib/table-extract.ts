// ─── Free, in-browser table extraction for PDFs and images ───
// Digital PDFs: read the embedded text layer via pdf.js (no OCR, exact).
// Scanned PDFs / photos: Tesseract.js OCR (Arabic + English) in the browser.
// Both produce positioned tokens → reconstructed into a rows×columns grid →
// analysed with the same header-detection used for Excel. Everything runs on
// the user's machine: no server, no keys, no cost, and files never leave it.

import { analyzeGrid, type SheetParse } from '@/lib/excel-materials'

export interface Token { text: string; x: number; y: number; w: number; h: number }

const AR = /[؀-ۿ]/

/** Rebuild a table from positioned tokens (works for pdf.js items & OCR words). */
export function tokensToGrid(tokens: Token[], pageWidth: number): string[][] {
  const clean = tokens.map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text)
  if (clean.length === 0) return []

  // 1) Rows: group by vertical position (tolerance from median token height)
  const medH = median(clean.map((t) => t.h)) || 10
  const rowTol = medH * 0.7
  const rows: Token[][] = []
  for (const t of [...clean].sort((a, b) => a.y - b.y)) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(centerY(t) - avgY(last)) <= rowTol) last.push(t)
    else rows.push([t])
  }

  // 2) Cells: inside each row, merge tokens separated by small gaps into one cell
  const charW = median(clean.map((t) => t.w / Math.max(1, t.text.length))) || 6
  const cellGap = Math.max(charW * 2.5, pageWidth * 0.015)
  type Cell = { text: string; x: number; tokens: Token[] }
  const rowCells: Cell[][] = rows.map((row) => {
    const sorted = [...row].sort((a, b) => a.x - b.x)
    const cells: Cell[] = []
    for (const t of sorted) {
      const last = cells[cells.length - 1]
      const lastEnd = last ? Math.max(...last.tokens.map((k) => k.x + k.w)) : -Infinity
      if (last && t.x - lastEnd <= cellGap) last.tokens.push(t)
      else cells.push({ text: '', x: 0, tokens: [t] })
    }
    for (const c of cells) {
      // Arabic phrases read right→left: join their tokens by descending x
      const arabic = c.tokens.some((k) => AR.test(k.text))
      const ordered = [...c.tokens].sort((a, b) => (arabic ? b.x - a.x : a.x - b.x))
      c.text = ordered.map((k) => k.text).join(' ')
      c.x = c.tokens.reduce((s, k) => s + k.x + k.w / 2, 0) / c.tokens.length
    }
    return cells
  })

  // 3) Columns: cluster all cell centers across rows
  const centers = rowCells.flat().map((c) => c.x).sort((a, b) => a - b)
  const colTol = Math.max(charW * 3, pageWidth * 0.03)
  const cols: number[] = []
  for (const x of centers) {
    if (cols.length === 0 || x - cols[cols.length - 1] > colTol) cols.push(x)
    else cols[cols.length - 1] = (cols[cols.length - 1] + x) / 2
  }

  // Arabic-dominant documents read right→left: first logical column is rightmost
  const arabicDoc = clean.filter((t) => AR.test(t.text)).length > clean.length / 3
  const orderedCols = arabicDoc ? [...cols].reverse() : cols

  // 4) Fill the grid
  return rowCells.map((cells) => {
    const out: string[] = Array.from({ length: orderedCols.length }, () => '')
    for (const c of cells) {
      let best = 0, bestDist = Infinity
      orderedCols.forEach((cx, i) => {
        const d = Math.abs(cx - c.x)
        if (d < bestDist) { bestDist = d; best = i }
      })
      out[best] = out[best] ? `${out[best]} ${c.text}` : c.text
    }
    return out
  })
}

/** Extract tables from a PDF: text layer first; OCR only if it's a scan. */
export async function extractPdf(
  file: File,
  onProgress: (msg: string) => void,
): Promise<SheetParse[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const pageCount = Math.min(doc.numPages, 10)   // cap for sanity; noted in UI
  const sheets: SheetParse[] = []
  let textTokensTotal = 0

  for (let p = 1; p <= pageCount; p++) {
    onProgress(`قراءة صفحة ${p} من ${pageCount}…`)
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const tokens: Token[] = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => ({
        text: String(it.str ?? ''),
        x: it.transform?.[4] ?? 0,
        // pdf y-origin is bottom-left; flip to top-left
        y: viewport.height - (it.transform?.[5] ?? 0),
        w: it.width ?? 0,
        h: it.height ?? 10,
      }))
      .filter((t: Token) => t.text.trim())

    textTokensTotal += tokens.length
    if (tokens.length > 3) {
      const grid = tokensToGrid(tokens, viewport.width)
      if (grid.length) sheets.push(analyzeGrid(grid, `صفحة ${p}`))
      continue
    }

    // No text layer → scanned page → render + OCR
    onProgress(`صفحة ${p} ممسوحة ضوئياً — جارٍ التعرف على النص (قد يستغرق دقيقة)…`)
    const scale = 2
    const vp = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width
    canvas.height = vp.height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
    const ocrTokens = await ocrCanvas(canvas)
    const grid = tokensToGrid(ocrTokens, vp.width)
    if (grid.length) sheets.push(analyzeGrid(grid, `صفحة ${p} (OCR)`))
  }

  void textTokensTotal
  return sheets.filter((s) => s.grid.length > 0)
}

/** Extract a table from a photo/screenshot via in-browser OCR. */
export async function extractImage(
  file: File,
  onProgress: (msg: string) => void,
): Promise<SheetParse[]> {
  onProgress('جارٍ التعرف على النص في الصورة (عربي + إنجليزي)…')
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')?.drawImage(img, 0, 0)
    const tokens = await ocrCanvas(canvas)
    const grid = tokensToGrid(tokens, canvas.width)
    return grid.length ? [analyzeGrid(grid, 'الصورة (OCR)')] : []
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function ocrCanvas(canvas: HTMLCanvasElement): Promise<Token[]> {
  const Tesseract = (await import('tesseract.js')).default
  const worker = await Tesseract.createWorker(['eng', 'ara'])
  try {
    const { data } = await worker.recognize(canvas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const words: any[] = (data as any).words ?? []
    return words
      .filter((w) => (w.confidence ?? 0) > 30 && w.text?.trim())
      .map((w) => ({
        text: String(w.text),
        x: w.bbox?.x0 ?? 0,
        y: w.bbox?.y0 ?? 0,
        w: (w.bbox?.x1 ?? 0) - (w.bbox?.x0 ?? 0),
        h: (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0),
      }))
  } finally {
    await worker.terminate()
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

const median = (arr: number[]) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const centerY = (t: Token) => t.y + t.h / 2
const avgY = (row: Token[]) => row.reduce((s, t) => s + centerY(t), 0) / row.length
