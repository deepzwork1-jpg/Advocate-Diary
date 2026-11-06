import { useState } from 'react'
import ErrorNote from './ErrorNote.jsx'

const BLANK = { title: '', court: '', case_number: '', status: 'active', next_hearing: '', notes: '' }

export default function MatterForm({ matter, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...Object.fromEntries(Object.entries(matter || {}).map(([key, value]) => [key, value ?? ''])),
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const field = (name) => ({
    value: form[name],
    onChange: (event) => setForm({ ...form, [name]: event.target.value }),
  })

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: form.title,
        court: form.court,
        status: form.status,
        // The API expects null, not an empty string, for anything left blank.
        case_number: form.case_number || null,
        next_hearing: form.next_hearing || null,
        notes: form.notes || null,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <ErrorNote message={error} />
      <label>Title<input required placeholder="Sharma v. State" {...field('title')} /></label>
      <label>Court<input required placeholder="Bombay High Court" {...field('court')} /></label>
      <div className="form-row">
        <label>Case number<input placeholder="WP 101/2026" {...field('case_number')} /></label>
        <label>Next hearing<input type="date" {...field('next_hearing')} /></label>
      </div>
      <label>
        Status
        <select {...field('status')}>
          <option>active</option>
          <option>adjourned</option>
          <option>closed</option>
        </select>
      </label>
      <label>Notes<textarea rows="3" {...field('notes')} /></label>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving}>{matter ? 'Save changes' : 'Add matter'}</button>
      </div>
    </form>
  )
}
