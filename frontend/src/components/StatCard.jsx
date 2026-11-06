export default function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon tone-${tone}`}><Icon size={20} /></span>
      <div>
        <strong>{value}</strong>
        <span className="muted">{label}</span>
      </div>
    </div>
  )
}
