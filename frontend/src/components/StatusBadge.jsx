import { CheckCircle2, CircleDot, Clock3, Gavel, Hourglass } from 'lucide-react'

const BADGES = {
  active: { icon: CircleDot, tone: 'blue' },
  adjourned: { icon: Clock3, tone: 'amber' },
  closed: { icon: CheckCircle2, tone: 'gray' },
  heard: { icon: Gavel, tone: 'blue' },
  reserved: { icon: Hourglass, tone: 'teal' },
  disposed: { icon: CheckCircle2, tone: 'gray' },
}

export default function StatusBadge({ value }) {
  const { icon: Icon, tone } = BADGES[value]
  return (
    <span className={`badge tone-${tone}`}>
      <Icon size={13} />
      {value}
    </span>
  )
}
