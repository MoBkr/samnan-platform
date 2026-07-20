// Prints its children on the official Samnan paper (فاتورة.pdf rendered as
// /letterhead.png): the artwork becomes a full-page background, and a layout
// table with repeating thead/tfoot spacers keeps content clear of the paper's
// header and footer on EVERY printed page. Invisible on screen — the table
// collapses via display:contents (see globals.css).
export function PrintPaper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/letterhead.png" alt="" aria-hidden className="print-paper-bg" />
      <table className="print-paper">
        <thead><tr><td><div className="print-paper-top" /></td></tr></thead>
        <tbody><tr><td><div className={`print-paper-cell ${className ?? ''}`}>{children}</div></td></tr></tbody>
        <tfoot><tr><td><div className="print-paper-bottom" /></td></tr></tfoot>
      </table>
    </>
  )
}
