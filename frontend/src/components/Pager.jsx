import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <nav className="pager" aria-label="Pages">
      <button className="icon-button" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>
      <span className="muted">Page {page} of {totalPages}</span>
      <button className="icon-button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}
