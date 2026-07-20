// Print-only document title. The company branding (logo, watermark, contact
// footer) comes from the official paper rendered by <PrintPaper> — this only
// names the document. Hidden on screen.
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hidden print:block mb-4 pb-2 text-center" style={{ borderBottom: '1px solid #dbe3f0' }}>
      <div style={{ fontSize: '14pt', fontWeight: 800, color: '#1841A0' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '10pt', color: '#555', marginTop: 3 }}>{subtitle}</div>}
    </div>
  )
}
