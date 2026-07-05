// Print-only letterhead with the Samnan logo + bilingual company name.
// Hidden on screen, shown when printing. Placed inside each printable region.
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hidden print:block mb-4 pb-3 text-center" style={{ borderBottom: '2px solid #1841A0' }}>
      <div className="flex items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/samnan.jpg" alt="سمنان" width={46} height={46} style={{ borderRadius: 8, objectFit: 'cover' }} />
        <div className="leading-tight">
          <div style={{ fontWeight: 800, fontSize: '17pt', color: '#1841A0' }}>سمنان للخدمات البترولية</div>
          <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '2px', color: '#1841A0' }}>SAMNAN PETROLEUM SERVICES</div>
        </div>
      </div>
      <div style={{ fontSize: '10.5pt', color: '#555', marginTop: 6 }}>
        {title}{subtitle ? ` — ${subtitle}` : ''}
      </div>
    </div>
  )
}
