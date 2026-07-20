// ─── Samnan official letterhead for popup prints ───
// Mirrors the company's paper (فاتورة.pdf): logo block top-right, a giant
// ghosted S-mark watermark in the middle, and the blue contact footer at the
// bottom of every page. Used by every window.open()-style print.

export const SAMNAN_BLUE = '#1841A0'

export const LETTERHEAD_FOOTER_LINES = [
  'Head Office P.O.Box: 4784 Riyadh 11412 Tel: 4477777 Fax: 4475555 - C/R 1010284729',
  'Mem. No. -229472 C/R -1010284729 E- mail: info@samnanpetro.com.sa',
]

// Shared styles: .lh-head (top brand block), .lh-mark (watermark), .lh-foot
// (fixed footer that repeats on every printed page).
export const LETTERHEAD_CSS = `
  @page { margin: 10mm 10mm 22mm; }
  body { padding-bottom: 64px; }
  .lh-head{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-bottom:16px;direction:ltr}
  .lh-head .txt{text-align:right}
  .lh-head .txt .ar{color:${SAMNAN_BLUE};font-size:19px;font-weight:800;line-height:1.25}
  .lh-head .txt .en{color:${SAMNAN_BLUE};font-size:10.5px;font-weight:700;letter-spacing:1.5px}
  .lh-head img{width:52px;height:52px;border-radius:10px;object-fit:cover}
  .lh-mark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:150mm;height:150mm;
    background-position:center;background-size:contain;background-repeat:no-repeat;
    filter:sepia(1) hue-rotate(185deg) saturate(1.4) brightness(1.1);opacity:.05;z-index:-1;border-radius:24mm}
  .lh-foot{position:fixed;bottom:0;left:0;right:0;direction:ltr;text-align:center;
    border-top:2px solid ${SAMNAN_BLUE};padding-top:7px;background:#fff}
  .lh-foot p{margin:2px 0;color:${SAMNAN_BLUE};font-size:10.5px;font-weight:600;font-family:Arial,sans-serif}
`

export function letterheadHeaderHtml(origin: string): string {
  return `<div class="lh-head">
    <div class="txt"><div class="ar">سمنان للخدمات البترولية</div><div class="en">SAMNAN PETROLEUM SERVICES</div></div>
    <img src="${origin}/samnan.jpg" alt="Samnan" />
  </div>`
}

export function letterheadFooterHtml(origin: string): string {
  return `<div class="lh-mark" style="background-image:url('${origin}/samnan.jpg')"></div>
  <div class="lh-foot">${LETTERHEAD_FOOTER_LINES.map((l) => `<p>${l}</p>`).join('')}</div>`
}
