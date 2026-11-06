import { Link } from 'react-router-dom'
import { Check, Trash2 } from 'lucide-react'
import { isOverdue, shortDate } from '../lib/format.js'

export default function TaskRow({ task, onToggle, onDelete, showMatter = true }) {
  const late = !task.done && task.due_date && isOverdue(task.due_date)
  return (
    <div className={`task-row${task.done ? ' done' : ''}`}>
      <button
        className="check"
        aria-pressed={task.done}
        aria-label={`Mark "${task.title}" as ${task.done ? 'not done' : 'done'}`}
        onClick={() => onToggle(task)}
      >
        {task.done && <Check size={14} />}
      </button>
      <div className="task-text">
        <span className="task-title">{task.title}</span>
        {showMatter && <Link to={`/matters/${task.matter_id}`} className="muted">{task.matter_title}</Link>}
      </div>
      {task.due_date && (
        <span className={late ? 'due late' : 'due muted'}>
          {late ? 'Overdue · ' : ''}{shortDate(task.due_date)}
        </span>
      )}
      <button className="icon-button" onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}>
        <Trash2 size={16} />
      </button>
    </div>
  )
}
