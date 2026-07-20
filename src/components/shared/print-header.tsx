import { LETTERHEAD_FOOTER_LINES } from '@/lib/print-letterhead'

// Print-only official letterhead — mirrors the company paper (فاتورة.pdf):
// brand block top-right, ghosted S-mark watermark mid-page, and the blue
// contact footer repeated at the bottom of every printed page.
// Hidden on screen; placed inside each printable region.
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      {/* Brand block — names beside the logo, pinned to the right like the paper */}
      <div className="hidden print:flex mb-4 items-center justify-end gap-3" dir="ltr">
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '15pt', color: '#1841A0', lineHeight: 1.25 }}>سمنان للخدمات البترولية</div>
          <div style={{ fontSize: '8pt', fontWeight: 700, letterSpacing: '1.5px', color: '#1841A0' }}>SAMNAN PETROLEUM SERVICES</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/samnan.jpg" alt="سمنان" width={52} height={52} style={{ borderRadius: 10, objectFit: 'cover' }} />
      </div>

      {/* Document title */}
      <div className="hidden print:block mb-4 pb-2 text-center" style={{ borderBottom: '1px solid #dbe3f0' }}>
        <div style={{ fontSize: '13pt', fontWeight: 700, color: '#1841A0' }}>
          {title}{subtitle ? ` — ${subtitle}` : ''}
        </div>
      </div>

      {/* Watermark + footer — fixed, so they repeat on every printed page */}
      <div
        className="hidden print:block print-lh-mark"
        style={{ backgroundImage: "url('/samnan.jpg')" }}
        aria-hidden
      />
      <div className="hidden print:block print-lh-foot" dir="ltr" aria-hidden>
        {LETTERHEAD_FOOTER_LINES.map((l) => <p key={l}>{l}</p>)}
      </div>
    </>
  )
}
