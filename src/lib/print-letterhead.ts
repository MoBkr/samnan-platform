// ─── Samnan official letterhead for popup prints ───
// The company paper (فاتورة.pdf) is rendered as /letterhead.png and used as a
// full-page background "template" behind every printed document. A layout
// table with repeating thead/tfoot spacers keeps the content clear of the
// artwork's header and footer on every printed page.

export const SAMNAN_BLUE = '#1841A0'

// Artwork zones measured from the paper: header ≈ top 26mm, footer ≈ bottom 24mm.
export const LETTERHEAD_CSS = `
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .lh-bg{position:fixed;inset:0;width:100%;height:100%;z-index:-1}
  .lh-layout{width:100%;border-collapse:collapse}
  .lh-layout > thead td, .lh-layout > tfoot td, .lh-layout > tbody > tr > td{border:none;padding:0;background:none}
  .lh-top{height:30mm}
  .lh-bottom{height:26mm}
  .lh-body{padding:0 12mm}
  /* White boxes would cover the watermark; on white paper transparent is identical */
  .lh-body [style*="background:#fff"], .lh-body [style*="background: #fff"]{background:transparent}
`

// Opens the template: background + layout table. Content goes right after,
// then letterheadCloseHtml() closes it.
export function letterheadOpenHtml(origin: string): string {
  return `<img class="lh-bg" src="${origin}/letterhead.png" alt="" />
  <table class="lh-layout">
    <thead><tr><td><div class="lh-top"></div></td></tr></thead>
    <tbody><tr><td><div class="lh-body">`
}

export function letterheadCloseHtml(): string {
  return `</div></td></tr></tbody>
    <tfoot><tr><td><div class="lh-bottom"></div></td></tr></tfoot>
  </table>`
}
