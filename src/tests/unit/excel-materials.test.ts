import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook, applyMapping, analyzeGrid, combineSheets } from '@/lib/excel-materials'

const normalizeStatus = (s: string) => {
  const v = (s || '').trim().toLowerCase()
  if (/^(completed|complete|done|مكتمل)/.test(v)) return 'مكتمل'
  if (/^(in[\s-]?progress|processing|قيد)/.test(v)) return 'قيد المعالجة'
  if (/^(not[\s-]?requested|pending|لم)/.test(v)) return 'لم يطلب'
  return ''
}

function wbToBuf(rows: unknown[][], sheetName = 'Sheet1'): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return out
}

describe('parseWorkbook', () => {
  it('parses a standard sheet with headers', () => {
    const buf = wbToBuf([
      ['SAP No', 'Description', 'Qty', 'STO No', 'Item Status', 'Note'],
      ['123456', 'PVC Pipe', 20, '', 'مكتمل', ''],
      ['234567', 'Cable 6mm', 150, '1010284729', 'قيد المعالجة', 'عاجل'],
    ])
    const parsed = parseWorkbook(XLSX, buf, normalizeStatus)
    expect(parsed.primary).not.toBeNull()
    const { items, unparsed } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping, normalizeStatus)
    expect(items).toHaveLength(2)
    expect(items[0].sap_no).toBe('123456')
    expect(items[0].quantity).toBe(20)
    expect(items[1].status).toBe('قيد المعالجة')
    expect(unparsed).toHaveLength(0)
  })

  it('never silently drops non-empty rows', () => {
    const buf = wbToBuf([
      ['SAP No', 'Description', 'Qty'],
      ['123456', 'Pipe', 5],
      ['', '', ''],                       // fully empty — ok to skip
      ['ملاحظة عامة عن الطلب', '', ''],   // header col has text but not sap/desc... actually col0=sap
    ])
    const parsed = parseWorkbook(XLSX, buf, normalizeStatus)
    const { items, unparsed } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping, normalizeStatus)
    // Every non-empty row is either an item or reported unparsed
    expect(items.length + unparsed.length).toBe(2)
  })

  it('handles Arabic headers and multiple sheets', () => {
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['م', 'رقم المادة', 'الوصف', 'الكمية', 'الحالة'],
      ['1', '445566', 'مواسير حريق', '30', 'مكتمل'],
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['SAP', 'Description', 'Qty'],
      ['778899', 'Valves', '12'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'ورقة1')
    XLSX.utils.book_append_sheet(wb, ws2, 'ورقة2')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    const parsed = parseWorkbook(XLSX, buf, normalizeStatus)
    expect(parsed.primary).not.toBeNull()
    const all = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping, normalizeStatus)
    expect(all.items.length + parsed.extraItems.length).toBe(2)
  })

  it('headerless sheet falls back to SAP anchor', () => {
    const buf = wbToBuf([
      ['123456', 'Pipe 4"', 20, '', 'Completed'],
      ['234567', 'Cable', 30, '', 'In Progress'],
    ])
    const parsed = parseWorkbook(XLSX, buf, normalizeStatus)
    const { items } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping, normalizeStatus)
    expect(items).toHaveLength(2)
    expect(items[0].sap_no).toBe('123456')
  })

  it('merged/numeric artifacts are normalised', () => {
    const buf = wbToBuf([
      ['SAP No', 'Description', 'Qty'],
      [123456, 'Pipe', '1,200'],
    ])
    const parsed = parseWorkbook(XLSX, buf, normalizeStatus)
    const { items } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping, normalizeStatus)
    expect(items[0].sap_no).toBe('123456')
    expect(items[0].quantity).toBe(1200)
  })

  it('combineSheets and analyzeGrid survive odd grids', () => {
    expect(combineSheets([], normalizeStatus).primary).toBeNull()
    const s = analyzeGrid([['فقط نص واحد']], 'x')
    expect(s.grid.length).toBe(1)
    const r = applyMapping(s.grid, s.headerRow, s.mapping, normalizeStatus)
    expect(r.items.length + r.unparsed.length).toBe(1)
  })
})
