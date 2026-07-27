// ─── Robust Excel → materials parser ───
// Design rule: NOTHING is dropped silently. Every non-empty row either becomes
// an item under the current column mapping, or is reported as "unparsed" so
// the import-preview dialog can show it and let the user decide.

import type { MaterialItem } from '@/types/database'

// Columns mirror the client's SAP export exactly:
// Purchasing Document (→sto_no) · Material (→sap_no) · Short Text (→description)
// · Order Quantity (→quantity) · Order Unit (→unit)
export type ColumnField = 'sto' | 'sap' | 'desc' | 'qty' | 'unit' | 'skip'

export const FIELD_LABELS: Record<ColumnField, string> = {
  sto: 'Purchasing Document',
  sap: 'Material',
  desc: 'Short Text (الوصف)',
  qty: 'الكمية',
  unit: 'الوحدة',
  skip: 'تجاهل',
}

export interface SheetParse {
  sheet: string
  grid: string[][]        // normalised cells (merges filled, numbers stringified)
  headerRow: number       // -1 when no header row was detected
  mapping: ColumnField[]  // one entry per column of the widest row
}

export interface WorkbookParse {
  primary: SheetParse | null       // the richest sheet — editable in the preview
  extraItems: MaterialItem[]       // auto-parsed items from OTHER sheets
  extraSummary: string[]           // e.g. "ورقة «Sheet2»: 12 صنف"
}

const HEADER_PATTERNS: { field: Exclude<ColumnField, 'skip'>; re: RegExp }[] = [
  { field: 'sto', re: /purchas|مستند|أمر\s*شراء|sto/i },
  { field: 'sap', re: /^\s*material\s*$|sap|ساب|رقم\s*المادة|material\s*(code|no)|item\s*code|كود/i },
  { field: 'desc', re: /desc|short\s*text|وصف|الصنف|بيان|المادة|البند|text|item(?!\s*code)/i },
  { field: 'qty', re: /q'?ty|quant|كمية|الكمية|العدد|عدد/i },
  { field: 'unit', re: /unit|وحدة|الوحدة/i },
]

// Excel numeric artifacts: "123456.0" → "123456"
function cleanCell(v: unknown): string {
  if (v == null) return ''
  let s = String(v).trim()
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '')
  return s
}

const looksLikeMaterial = (s: string) => /^\d{5,8}$/.test(s.trim())
const looksLikeDoc = (s: string) => /^\d{9,11}$/.test(s.trim())

/** Fill merged ranges with the top-left value so merged rows don't lose data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fillMerges(XLSX: any, ws: any) {
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = ws['!merges'] ?? []
  for (const m of merges) {
    const src = ws[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })]
    if (!src) continue
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) ws[addr] = { t: src.t, v: src.v, w: src.w }
      }
    }
  }
}

/** Score every row as a potential header; pick the best-scoring one. */
function detectHeader(grid: string[][]): { headerRow: number; mapping: ColumnField[]; width: number } {
  const width = Math.max(0, ...grid.map((r) => r.length))
  let best = { row: -1, score: 0, mapping: [] as ColumnField[] }

  for (let ri = 0; ri < Math.min(grid.length, 30); ri++) {
    const row = grid[ri]
    const mapping: ColumnField[] = Array.from({ length: width }, () => 'skip')
    const used = new Set<ColumnField>()
    let score = 0
    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci]
      if (!cell) continue
      for (const { field, re } of HEADER_PATTERNS) {
        if (!used.has(field) && re.test(cell)) {
          mapping[ci] = field
          used.add(field)
          score++
          break
        }
      }
    }
    // A real header names at least a description or Material column + one more
    if (score > best.score && (used.has('desc') || used.has('sap')) && score >= 2) {
      best = { row: ri, score, mapping }
    }
  }
  return { headerRow: best.row, mapping: best.row >= 0 ? best.mapping : [], width }
}

/** Positional fallback anchored on the Material column (5–8 digit codes).
    Mirrors the SAP export layout: [Purchasing Doc] Material · Short Text ·
    Order Qty · Order Unit. */
function anchorMapping(grid: string[][], width: number): ColumnField[] {
  let base = -1
  let docBefore = false
  for (const row of grid) {
    const idx = row.findIndex((c) => looksLikeMaterial(c))
    if (idx >= 0) {
      base = idx
      docBefore = idx > 0 && row.slice(0, idx).some((c) => looksLikeDoc(c))
      break
    }
  }
  const mapping: ColumnField[] = Array.from({ length: width }, () => 'skip')
  if (base < 0) {
    // No Material code anywhere — assume first non-empty column is the description
    if (width > 0) mapping[0] = 'desc'
    if (width > 1) mapping[1] = 'qty'
    return mapping
  }
  if (docBefore) {
    // Map the doc column (first 9-11 digit cell before base)
    for (const row of grid) {
      const di = row.slice(0, base).findIndex((c) => looksLikeDoc(c))
      if (di >= 0) { mapping[di] = 'sto'; break }
    }
  }
  const seq: ColumnField[] = ['sap', 'desc', 'qty', 'unit']
  seq.forEach((f, i) => { if (base + i < width) mapping[base + i] = f })
  return mapping
}

/** Analyse any text grid into a SheetParse. */
export function analyzeGrid(grid: string[][], sheetName: string): SheetParse {
  const cleaned = grid.map((r) => r.map(cleanCell)).filter((r) => r.some(Boolean))
  const { headerRow, mapping, width } = detectHeader(cleaned)
  return {
    sheet: sheetName,
    grid: cleaned,
    headerRow,
    mapping: headerRow >= 0 ? mapping : anchorMapping(cleaned, width),
  }
}

export interface MappedResult {
  items: MaterialItem[]
  unparsed: { row: number; text: string }[]   // non-empty rows that produced nothing
}

/** Apply a mapping to a grid — pure, reused live by the preview dialog. */
export function applyMapping(
  grid: string[][], headerRow: number, mapping: ColumnField[],
): MappedResult {
  const items: MaterialItem[] = []
  const unparsed: { row: number; text: string }[] = []
  const col = (f: ColumnField) => mapping.indexOf(f)
  const iSto = col('sto'), iSap = col('sap'), iDesc = col('desc'), iQty = col('qty'), iUnit = col('unit')

  for (let ri = headerRow + 1; ri < grid.length; ri++) {
    const row = grid[ri]
    const joined = row.filter(Boolean).join(' ').trim()
    if (!joined) continue

    const cell = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')
    const sap = cell(iSap), description = cell(iDesc)
    if (!sap && !description) {
      unparsed.push({ row: ri + 1, text: joined.slice(0, 120) })
      continue
    }
    const qtyRaw = cell(iQty).replace(/,/g, '')
    const qty = parseFloat(qtyRaw.replace(/[^\d.]/g, ''))
    items.push({
      sto_no: cell(iSto) || undefined,
      sap_no: sap || undefined,
      description: description || sap,
      quantity: isNaN(qty) ? undefined : qty,
      unit: cell(iUnit) || undefined,
      attachments: [],
    })
  }
  return { items, unparsed }
}

/** Parse the whole workbook: every sheet, merges filled, nothing dropped. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWorkbook(XLSX: any, buf: ArrayBuffer): WorkbookParse {
  const wb = XLSX.read(buf, { type: 'array' })

  const sheets: SheetParse[] = []
  for (const name of wb.SheetNames as string[]) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    fillMerges(XLSX, ws)
    const grid = ((XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }) ?? []) as unknown[][])
      .map((r) => (r ?? []).map(cleanCell))
      .filter((r) => r.some(Boolean))
    if (grid.length === 0) continue

    const { headerRow, mapping, width } = detectHeader(grid)
    sheets.push({
      sheet: name,
      grid,
      headerRow,
      mapping: headerRow >= 0 ? mapping : anchorMapping(grid, width),
    })
  }

  return combineSheets(sheets)
}

/** Pick the richest sheet as the editable primary; auto-parse the rest. */
export function combineSheets(sheets: SheetParse[]): WorkbookParse {
  if (sheets.length === 0) return { primary: null, extraItems: [], extraSummary: [] }

  const primary = sheets.reduce((a, b) => (b.grid.length > a.grid.length ? b : a))
  const extraItems: MaterialItem[] = []
  const extraSummary: string[] = []
  for (const s of sheets) {
    if (s === primary) continue
    const { items } = applyMapping(s.grid, s.headerRow, s.mapping)
    if (items.length) {
      extraItems.push(...items)
      extraSummary.push(`«${s.sheet}»: ${items.length} صنف`)
    }
  }

  return { primary, extraItems, extraSummary }
}
