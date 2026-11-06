import { History } from 'lucide-react'
import { timeAgo } from '../lib/format.js'
import EmptyState from './EmptyState.jsx'

export default function ActivityFeed({ entries }) {
  if (entries.length === 0) {
    return <EmptyState icon={History} title="Nothing yet" hint="Changes will appear here." />
  }
  return (
    <ol className="timeline">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span>{entry.message}</span>
          <small className="muted">{timeAgo(entry.created_at)}</small>
        </li>
      ))}
    </ol>
  )
}
