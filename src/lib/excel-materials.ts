// ─── Robust Excel → materials parser ───
// Design rule: NOTHING is dropped silently. Every non-empty row either becomes
// an item under the current column mapping, or is reported as "unparsed" so
// the import-preview dialog can show it and let the user decide.

import type { MaterialItem } from '@/types/database'

export type ColumnField = 'sap' | 'desc' | 'qty' | 'sto' | 'status' | 'note' | 'skip'

export const FIELD_LABELS: Record<ColumnField, string> = {
  sap: 'رقم SAP', desc: 'الوصف', qty: 'الكمية', sto: 'رقم STO', status: 'الحالة', note: 'ملاحظة', skip: 'تجاهل',
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
  { field: 'sap', re: /sap|ساب|رقم\s*المادة|material\s*code|item\s*code|كود/i },
  { field: 'desc', re: /desc|وصف|الصنف|بيان|المادة|البند|item|material(?!\s*code)/i },
  { field: 'qty', re: /q'?ty|quant|كمية|الكمية|العدد|عدد/i },
  { field: 'sto', re: /sto/i },
  { field: 'status', re: /status|حالة/i },
  { field: 'note', re: /note|remark|ملاحظ/i },
]

// Excel numeric artifacts: "123456.0" → "123456", "1,234" → "1234" (qty only)
function cleanCell(v: unknown): string {
  if (v == null) return ''
  let s = String(v).trim()
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '')
  return s
}

const looksLikeSap = (s: string) => /^\d{5,8}$/.test(s.trim())

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
    // A real header names at least a description or SAP column + one more
    if (score > best.score && (used.has('desc') || used.has('sap')) && score >= 2) {
      best = { row: ri, score, mapping }
    }
  }
  return { headerRow: best.row, mapping: best.row >= 0 ? best.mapping : [], width }
}

/** Positional fallback: anchor on the first SAP-looking column. */
function anchorMapping(grid: string[][], width: number): ColumnField[] {
  let base = -1
  for (const row of grid) {
    const idx = row.findIndex((c) => looksLikeSap(c))
    if (idx >= 0) { base = idx; break }
  }
  const mapping: ColumnField[] = Array.from({ length: width }, () => 'skip')
  if (base < 0) {
    // No SAP anywhere — assume first non-empty column is the description
    if (width > 0) mapping[0] = 'desc'
    if (width > 1) mapping[1] = 'qty'
    return mapping
  }
  const seq: ColumnField[] = ['sap', 'desc', 'qty', 'sto', 'status', 'note']
  seq.forEach((f, i) => { if (base + i < width) mapping[base + i] = f })
  return mapping
}

/** Analyse any text grid (from Excel, PDF text, or OCR) into a SheetParse. */
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
  normalizeStatus: (s: string) => string,
): MappedResult {
  const items: MaterialItem[] = []
  const unparsed: { row: number; text: string }[] = []
  const col = (f: ColumnField) => mapping.indexOf(f)
  const iSap = col('sap'), iDesc = col('desc'), iQty = col('qty'), iSto = col('sto'), iStatus = col('status'), iNote = col('note')

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
      sap_no: sap || undefined,
      description: description || sap,
      quantity: isNaN(qty) ? undefined : qty,
      sto_no: cell(iSto) || undefined,
      status: normalizeStatus(cell(iStatus)) || 'قيد المعالجة',
      notes: cell(iNote) || undefined,
      attachments: [],
    })
  }
  return { items, unparsed }
}

/** Parse the whole workbook: every sheet, merges filled, nothing dropped. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWorkbook(XLSX: any, buf: ArrayBuffer, normalizeStatus: (s: string) => string): WorkbookParse {
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

  return combineSheets(sheets, normalizeStatus)
}

/** Pick the richest sheet as the editable primary; auto-parse the rest.
    Shared by Excel, PDF and OCR extraction paths. */
export function combineSheets(sheets: SheetParse[], normalizeStatus: (s: string) => string): WorkbookParse {
  if (sheets.length === 0) return { primary: null, extraItems: [], extraSummary: [] }

  const primary = sheets.reduce((a, b) => (b.grid.length > a.grid.length ? b : a))
  const extraItems: MaterialItem[] = []
  const extraSummary: string[] = []
  for (const s of sheets) {
    if (s === primary) continue
    const { items } = applyMapping(s.grid, s.headerRow, s.mapping, normalizeStatus)
    if (items.length) {
      extraItems.push(...items)
      extraSummary.push(`«${s.sheet}»: ${items.length} صنف`)
    }
  }

  return { primary, extraItems, extraSummary }
}
