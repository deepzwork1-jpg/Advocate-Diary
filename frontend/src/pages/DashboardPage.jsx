import { Link } from 'react-router-dom'
import { Archive, Briefcase, CalendarDays, CheckSquare, Clock3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api.js'
import ActivityFeed from '../components/ActivityFeed.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorNote from '../components/ErrorNote.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import TaskRow from '../components/TaskRow.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useLoad } from '../hooks/useLoad.js'
import { dayAndMonth } from '../lib/format.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, error, reload } = useLoad(async () => {
    const [stats, upcoming, tasks, activity] = await Promise.all([
      api.stats(),
      api.upcoming(),
      api.listTasks({ done: false }),
      api.activity(),
    ])
    return { stats, upcoming, tasks, activity }
  }, [])

  const changeTask = async (action) => {
    try {
      await action()
      await reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here is your practice at a glance." />
      <ErrorNote message={error} />

      {!data ? <Skeleton rows={5} /> : (
        <>
          <section className="stat-grid" aria-label="Summary">
            <StatCard icon={Briefcase} label="Active" value={data.stats.active} />
            <StatCard icon={Clock3} label="Adjourned" value={data.stats.adjourned} tone="amber" />
            <StatCard icon={Archive} label="Closed" value={data.stats.closed} tone="gray" />
            <StatCard icon={CalendarDays} label="Hearings in 7 days" value={data.stats.hearings_this_week} tone="teal" />
          </section>

          <div className="two-columns">
            <section className="card">
              <div className="card-title">
                <h2>Next 7 days</h2>
                <Link to="/calendar">Calendar</Link>
              </div>
              {data.upcoming.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No hearings coming up" />
              ) : data.upcoming.map((matter) => (
                <Link className="hearing-row" to={`/matters/${matter.id}`} key={matter.id}>
                  <span className="date-chip">{dayAndMonth(matter.next_hearing)}</span>
                  <span className="hearing-text">
                    <strong>{matter.title}</strong>
                    <small className="muted">{matter.court}</small>
                  </span>
                  <StatusBadge value={matter.status} />
                </Link>
              ))}
            </section>

            <section className="card">
              <div className="card-title">
                <h2>Open tasks</h2>
                <Link to="/tasks">All tasks</Link>
              </div>
              {data.tasks.length === 0 ? (
                <EmptyState icon={CheckSquare} title="All caught up" />
              ) : data.tasks.slice(0, 5).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => changeTask(() => api.updateTask(task.id, { done: true }))}
                  onDelete={() => changeTask(() => api.deleteTask(task.id))}
                />
              ))}
            </section>
          </div>

          <section className="card">
            <div className="card-title"><h2>Recent activity</h2></div>
            <ActivityFeed entries={data.activity} />
          </section>
        </>
      )}
    </>
  )
}
