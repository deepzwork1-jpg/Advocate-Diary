export default function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon size={24} /></span>
      <strong>{title}</strong>
      {hint && <p className="muted">{hint}</p>}
      {children}
    </div>
  )
}
