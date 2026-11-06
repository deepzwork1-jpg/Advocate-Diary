import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorNote from '../components/ErrorNote.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useLoad } from '../hooks/useLoad.js'
import { shortDate, toIso } from '../lib/format.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONDAY = { weekStartsOn: 1 }

export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => toIso(new Date()))

  const firstCell = startOfWeek(startOfMonth(month), MONDAY)
  const lastCell = endOfWeek(endOfMonth(month), MONDAY)
  const days = eachDayOfInterval({ start: firstCell, end: lastCell })

  const { data, error } = useLoad(
    () => api.calendar(toIso(firstCell), toIso(lastCell)),
    [month]
  )

  const byDay = {}
  for (const entry of data || []) {
    byDay[entry.date] = [...(byDay[entry.date] || []), entry]
  }
  const dayEntries = byDay[selected] || []

  return (
    <>
      <PageHeader title="Calendar" subtitle="Dates to come and hearings already recorded.">
        <button className="icon-button" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <strong className="month-label">{format(month, 'MMMM yyyy')}</strong>
        <button className="icon-button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </PageHeader>
      <ErrorNote message={error} />

      {!data ? <Skeleton rows={6} /> : (
        <div className="calendar-layout">
          <section className="card calendar">
            {WEEKDAYS.map((day) => <span className="weekday" key={day}>{day}</span>)}
            {days.map((day) => {
              const iso = toIso(day)
              const count = (byDay[iso] || []).length
              const classes = [
                'day',
                isSameMonth(day, month) ? '' : 'outside',
                isToday(day) ? 'today' : '',
                iso === selected ? 'selected' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={iso}
                  className={classes}
                  onClick={() => setSelected(iso)}
                  aria-label={`${format(day, 'd MMMM')}, ${count} ${count === 1 ? 'entry' : 'entries'}`}
                >
                  <span>{format(day, 'd')}</span>
                  {count > 0 && <small className="day-count">{count}</small>}
                </button>
              )
            })}
          </section>

          <section className="card">
            <div className="card-title"><h2>{shortDate(selected)}</h2></div>
            {dayEntries.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing on this day" />
            ) : dayEntries.map((entry) => (
              <Link className="hearing-row" to={`/matters/${entry.matter_id}`} key={`${entry.kind}-${entry.matter_id}-${entry.outcome}`}>
                <span className="hearing-text">
                  <strong>{entry.title}</strong>
                  <small className="muted">{entry.court}</small>
                </span>
                {entry.outcome ? <StatusBadge value={entry.outcome} /> : <span className="badge tone-teal">listed</span>}
              </Link>
            ))}
          </section>
        </div>
      )}
    </>
  )
}
