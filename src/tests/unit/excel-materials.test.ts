import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook, applyMapping, analyzeGrid, combineSheets } from '@/lib/excel-materials'

function wbToBuf(rows: unknown[][], sheetName = 'Sheet1'): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseWorkbook — SAP export columns', () => {
  it('parses the client layout: Purchasing Document · Material · Short Text · Qty · Unit', () => {
    const buf = wbToBuf([
      ['Purchasing Document', 'Material', 'Short Text', 'Order Quantity', 'Order Unit'],
      ['9200043607', '5000674', 'غطاس بنزين ST', 4, 'EA'],
      ['9200043607', '7003027', 'EVO with DISPLAY, PRINTER', 2, 'EA'],
    ])
    const parsed = parseWorkbook(XLSX, buf)
    expect(parsed.primary).not.toBeNull()
    const { items, unparsed } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping)
    expect(items).toHaveLength(2)
    expect(items[0].sto_no).toBe('9200043607')
    expect(items[0].sap_no).toBe('5000674')
    expect(items[0].quantity).toBe(4)
    expect(items[0].unit).toBe('EA')
    expect(items[1].description).toBe('EVO with DISPLAY, PRINTER')
    expect(unparsed).toHaveLength(0)
  })

  it('headerless sheet: anchors on Material, doc column before it is detected', () => {
    const buf = wbToBuf([
      ['9200043607', '7003344', '2" Float Kit for fuel tank', 2, 'EA'],
      ['9200043607', '5000686', 'Inventory Probe 2"', 2, 'EA'],
    ])
    const parsed = parseWorkbook(XLSX, buf)
    const { items } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping)
    expect(items).toHaveLength(2)
    expect(items[0].sto_no).toBe('9200043607')
    expect(items[0].sap_no).toBe('7003344')
    expect(items[0].unit).toBe('EA')
  })

  it('never silently drops non-empty rows', () => {
    const buf = wbToBuf([
      ['Material', 'Short Text', 'Qty'],
      ['123456', 'Pipe', 5],
      ['', '', ''],                     // fully empty — ok to skip
      ['ملاحظة عامة عن الطلب', '', ''], // text without material/desc mapping → unparsed or item
    ])
    const parsed = parseWorkbook(XLSX, buf)
    const { items, unparsed } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping)
    expect(items.length + unparsed.length).toBe(2)
  })

  it('handles Arabic headers and multiple sheets', () => {
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['مستند الشراء', 'رقم المادة', 'الوصف', 'الكمية', 'الوحدة'],
      ['9200043607', '445566', 'مواسير حريق', '30', 'EA'],
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Material', 'Short Text', 'Qty'],
      ['778899', 'Valves', '12'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'ورقة1')
    XLSX.utils.book_append_sheet(wb, ws2, 'ورقة2')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    const parsed = parseWorkbook(XLSX, buf)
    const all = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping)
    expect(all.items.length + parsed.extraItems.length).toBe(2)
  })

  it('numeric artifacts are normalised', () => {
    const buf = wbToBuf([
      ['Material', 'Short Text', 'Order Quantity'],
      [123456, 'Pipe', '1,200'],
    ])
    const parsed = parseWorkbook(XLSX, buf)
    const { items } = applyMapping(parsed.primary!.grid, parsed.primary!.headerRow, parsed.primary!.mapping)
    expect(items[0].sap_no).toBe('123456')
    expect(items[0].quantity).toBe(1200)
  })

  it('combineSheets and analyzeGrid survive odd grids', () => {
    expect(combineSheets([]).primary).toBeNull()
    const s = analyzeGrid([['فقط نص واحد']], 'x')
    expect(s.grid.length).toBe(1)
    const r = applyMapping(s.grid, s.headerRow, s.mapping)
    expect(r.items.length + r.unparsed.length).toBe(1)
  })
})
