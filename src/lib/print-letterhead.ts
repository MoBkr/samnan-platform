// ─── Samnan print header for popup prints ───
// The official company logo (print-logo.png) at the top of every printed
// document, above a thin brand rule. Used by every window.open()-style print.

export const SAMNAN_BLUE = '#1841A0'

export const LETTERHEAD_CSS = `
  @page { size: A4 portrait; margin: 12mm 10mm; }
  .lh-head{text-align:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${SAMNAN_BLUE}}
  .lh-head img{width:240px;max-width:72%;height:auto}
`

// Opens the document: logo header + content wrapper (kept so popup styles
// scoped under .lh-body keep working). letterheadCloseHtml() closes it.
export function letterheadOpenHtml(origin: string): string {
  return `<div class="lh-head"><img src="${origin}/print-logo.png" alt="سمنان للخدمات البترولية" /></div>
  <div class="lh-body">`
}

export function letterheadCloseHtml(): string {
  return `</div>`
}
