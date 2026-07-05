// Print-only header with the Samnan logo (SAM). Hidden on screen, shown when
// printing. Placed inside each printable region so it appears on every document.
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hidden print:flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/samnan.jpg" alt="مجموعة سمنان القابضة" width={46} height={46} style={{ borderRadius: 8, objectFit: 'cover' }} />
      <div className="leading-tight">
        <div style={{ fontWeight: 800, fontSize: '15pt', color: '#1841A0' }}>مجموعة سمنان القابضة</div>
        <div style={{ fontSize: '10.5pt', color: '#555' }}>{title}{subtitle ? ` — ${subtitle}` : ''}</div>
      </div>
    </div>
  )
}
