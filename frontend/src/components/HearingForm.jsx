import { useState } from 'react'
import { toIso } from '../lib/format.js'
import ErrorNote from './ErrorNote.jsx'

export default function HearingForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    hearing_date: toIso(new Date()),
    outcome: 'heard',
    purpose: '',
    next_date: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const disposed = form.outcome === 'disposed'

  const field = (name) => ({
    value: form[name],
    onChange: (event) => setForm({ ...form, [name]: event.target.value }),
  })

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        hearing_date: form.hearing_date,
        outcome: form.outcome,
        purpose: form.purpose || null,
        notes: form.notes || null,
        next_date: disposed ? null : form.next_date || null,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <ErrorNote message={error} />
      <div className="form-row">
        <label>Hearing date<input required type="date" {...field('hearing_date')} /></label>
        <label>
          Outcome
          <select {...field('outcome')}>
            <option>heard</option>
            <option>adjourned</option>
            <option>reserved</option>
            <option>disposed</option>
          </select>
        </label>
      </div>
      <label>Purpose<input placeholder="Arguments" {...field('purpose')} /></label>
      {!disposed && <label>Next date<input type="date" {...field('next_date')} /></label>}
      <label>Notes<textarea rows="3" {...field('notes')} /></label>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving}>Record hearing</button>
      </div>
    </form>
  )
}
