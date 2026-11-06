import { useState } from 'react'
import { CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorNote from '../components/ErrorNote.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import TaskRow from '../components/TaskRow.jsx'
import { useLoad } from '../hooks/useLoad.js'

const VIEWS = [
  { key: 'open', label: 'Open', params: { done: false } },
  { key: 'done', label: 'Done', params: { done: true } },
  { key: 'all', label: 'All', params: {} },
]

export default function TasksPage() {
  const [view, setView] = useState('open')
  const { data, error, reload } = useLoad(
    () => api.listTasks(VIEWS.find(({ key }) => key === view).params),
    [view]
  )

  const change = async (action) => {
    try {
      await action()
      await reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <PageHeader title="Tasks" subtitle="Everything to do across your matters." />
      <ErrorNote message={error} />

      <div className="tabs" role="tablist">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            className={view === key ? 'tab active' : 'tab'}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="card">
        {!data ? <Skeleton rows={5} /> : data.length === 0 ? (
          <EmptyState icon={CheckSquare} title="Nothing here" hint="Add tasks from inside a matter." />
        ) : data.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => change(() => api.updateTask(task.id, { done: !task.done }))}
            onDelete={() => change(() => api.deleteTask(task.id))}
          />
        ))}
      </section>
    </>
  )
}
