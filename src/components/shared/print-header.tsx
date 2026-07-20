// Print-only letterhead: the official company logo at the top of the printed
// document, then the document title under a thin brand rule. Hidden on screen.
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hidden print:block mb-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/print-logo.png"
        alt="سمنان للخدمات البترولية"
        style={{ width: 240, maxWidth: '72%', height: 'auto', margin: '0 auto' }}
      />
      <div className="mt-3 pt-2" style={{ borderTop: '2px solid #1841A0' }}>
        <div style={{ fontSize: '13pt', fontWeight: 800, color: '#1841A0' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '10pt', color: '#555', marginTop: 3 }}>{subtitle}</div>}
      </div>
    </div>
  )
}
