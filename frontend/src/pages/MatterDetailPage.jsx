import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Gavel,
  History,
  Landmark,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api.js'
import ActivityFeed from '../components/ActivityFeed.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorNote from '../components/ErrorNote.jsx'
import HearingForm from '../components/HearingForm.jsx'
import MatterForm from '../components/MatterForm.jsx'
import Modal from '../components/Modal.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import TaskRow from '../components/TaskRow.jsx'
import { useLoad } from '../hooks/useLoad.js'
import { shortDate } from '../lib/format.js'

const TABS = [
  { key: 'hearings', label: 'Hearings', icon: Gavel },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'activity', label: 'Activity', icon: History },
]

export default function MatterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('hearings')
  const [dialog, setDialog] = useState(null)
  const [newTask, setNewTask] = useState({ title: '', due_date: '' })

  const { data, error, reload } = useLoad(async () => {
    const [matter, hearings, tasks, activity] = await Promise.all([
      api.getMatter(id),
      api.listHearings(id),
      api.listTasks({ matter_id: id }),
      api.matterActivity(id),
    ])
    return { matter, hearings, tasks, activity }
  }, [id])

  const change = async (action) => {
    try {
      await action()
      await reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const saveMatter = async (fields) => {
    await api.updateMatter(id, fields)
    setDialog(null)
    toast.success('Matter saved')
    await reload()
  }

  const recordHearing = async (hearing) => {
    await api.recordHearing(id, hearing)
    setDialog(null)
    toast.success('Hearing recorded')
    await reload()
  }

  const deleteMatter = async () => {
    if (!window.confirm(`Delete "${data.matter.title}" and its hearings and tasks?`)) return
    try {
      await api.deleteMatter(id)
      toast.success('Matter deleted')
      navigate('/matters')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const addTask = (event) => {
    event.preventDefault()
    change(async () => {
      await api.createTask(id, { title: newTask.title, due_date: newTask.due_date || null })
      setNewTask({ title: '', due_date: '' })
    })
  }

  if (error && !data) {
    return (
      <>
        <Link className="back" to="/matters"><ArrowLeft size={16} />Matters</Link>
        <ErrorNote message={error} />
      </>
    )
  }
  if (!data) return <Skeleton rows={6} />

  const { matter, hearings, tasks, activity } = data

  return (
    <>
      <Link className="back" to="/matters"><ArrowLeft size={16} />Matters</Link>

      <section className="card matter-head">
        <div className="matter-head-top">
          <div>
            <h1>{matter.title}</h1>
            <StatusBadge value={matter.status} />
          </div>
          <div className="page-actions">
            <button className="secondary" onClick={() => setDialog('edit')}><Pencil size={16} />Edit</button>
            <button className="danger" onClick={deleteMatter}><Trash2 size={16} />Delete</button>
          </div>
        </div>
        <dl className="facts">
          <div><dt><Landmark size={14} />Court</dt><dd>{matter.court}</dd></div>
          <div><dt><Gavel size={14} />Case number</dt><dd>{matter.case_number || 'Not set'}</dd></div>
          <div>
            <dt><CalendarDays size={14} />Next hearing</dt>
            <dd>{matter.next_hearing ? shortDate(matter.next_hearing) : 'Not set'}</dd>
          </div>
        </dl>
        {matter.notes && <p className="notes">{matter.notes}</p>}
      </section>

      <div className="tabs" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'tab active' : 'tab'}
            onClick={() => setTab(key)}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      <section className="card">
        {tab === 'hearings' && (
          <>
            <div className="card-title">
              <h2>Hearing history</h2>
              <button onClick={() => setDialog('hearing')}><Plus size={16} />Record hearing</button>
            </div>
            {hearings.length === 0 ? (
              <EmptyState icon={Gavel} title="No hearings recorded" hint="Record what happened after each date." />
            ) : (
              <ol className="timeline">
                {hearings.map((hearing) => (
                  <li key={hearing.id}>
                    <div className="timeline-head">
                      <strong>{shortDate(hearing.hearing_date)}</strong>
                      <StatusBadge value={hearing.outcome} />
                    </div>
                    {hearing.purpose && <span>{hearing.purpose}</span>}
                    {hearing.notes && <small className="muted">{hearing.notes}</small>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {tab === 'tasks' && (
          <>
            <div className="card-title"><h2>Tasks</h2></div>
            <form className="inline-form" onSubmit={addTask}>
              <input
                required
                aria-label="New task"
                placeholder="Add a task"
                value={newTask.title}
                onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
              />
              <input
                type="date"
                aria-label="Due date"
                value={newTask.due_date}
                onChange={(event) => setNewTask({ ...newTask, due_date: event.target.value })}
              />
              <button type="submit" aria-label="Add task"><Plus size={16} /></button>
            </form>
            {tasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No tasks yet" />
            ) : tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                showMatter={false}
                onToggle={() => change(() => api.updateTask(task.id, { done: !task.done }))}
                onDelete={() => change(() => api.deleteTask(task.id))}
              />
            ))}
          </>
        )}

        {tab === 'activity' && (
          <>
            <div className="card-title"><h2>Activity</h2></div>
            <ActivityFeed entries={activity} />
          </>
        )}
      </section>

      {dialog === 'edit' && (
        <Modal title="Edit matter" onClose={() => setDialog(null)}>
          <MatterForm matter={matter} onSubmit={saveMatter} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {dialog === 'hearing' && (
        <Modal title="Record a hearing" onClose={() => setDialog(null)}>
          <HearingForm onSubmit={recordHearing} onCancel={() => setDialog(null)} />
        </Modal>
      )}
    </>
  )
}
