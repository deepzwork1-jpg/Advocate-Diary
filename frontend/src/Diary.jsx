import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

const PAGE_SIZE = 8
const STATUSES = ['active', 'adjourned', 'closed']
const EMPTY_FORM = { title: '', court: '', case_number: '', next_hearing: '', notes: '' }

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Diary({ user, onSignOut }) {
  const [matters, setMatters] = useState({ items: [], total: 0 })
  const [stats, setStats] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (search.trim()) params.q = search.trim()
      if (statusFilter) params.status = statusFilter
      const [list, totals, soon] = await Promise.all([api.list(params), api.stats(), api.upcoming()])
      setMatters(list)
      setStats(totals)
      setUpcoming(soon)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const run = async (action) => {
    try {
      await action()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const addMatter = (event) => {
    event.preventDefault()
    run(async () => {
      // The API expects null, not an empty string, for a date that was left blank.
      await api.create({ ...form, next_hearing: form.next_hearing || null })
      setForm(EMPTY_FORM)
    })
  }

  const deleteMatter = (matter) => {
    if (window.confirm(`Delete "${matter.title}"?`)) run(() => api.remove(matter.id))
  }

  const totalPages = Math.max(1, Math.ceil(matters.total / PAGE_SIZE))
  const field = (name) => ({
    value: form[name],
    onChange: (event) => setForm({ ...form, [name]: event.target.value }),
  })

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Hearing Diary</h1>
          <p className="muted">Signed in as {user.name}</p>
        </div>
        <button className="quiet" onClick={onSignOut}>Sign out</button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {stats && (
        <section className="stats" aria-label="Summary">
          <Stat label="Active" value={stats.active} />
          <Stat label="Adjourned" value={stats.adjourned} />
          <Stat label="Closed" value={stats.closed} />
          <Stat label="Hearings in 7 days" value={stats.hearings_this_week} />
        </section>
      )}

      <div className="columns">
        <section className="card">
          <h2>Add a matter</h2>
          <form onSubmit={addMatter}>
            <label>Title<input required placeholder="Sharma v. State" {...field('title')} /></label>
            <label>Court<input required placeholder="Bombay High Court" {...field('court')} /></label>
            <label>Case number<input placeholder="WP 101/2026" {...field('case_number')} /></label>
            <label>Next hearing<input type="date" {...field('next_hearing')} /></label>
            <label>Notes<textarea rows="2" {...field('notes')} /></label>
            <button type="submit">Add matter</button>
          </form>
        </section>

        <section className="card">
          <h2>Next 7 days</h2>
          {upcoming.length === 0 && <p className="muted">No hearings coming up.</p>}
          <ul className="upcoming">
            {upcoming.map((matter) => (
              <li key={matter.id}>
                <strong>{formatDate(matter.next_hearing)}</strong>
                <span>{matter.title}</span>
                <span className="muted">{matter.court}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="toolbar">
          <h2>Matters ({matters.total})</h2>
          <input
            aria-label="Search matters"
            placeholder="Search title, court or number"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        {matters.items.length === 0 && <p className="muted">No matters found.</p>}

        {matters.items.map((matter) => (
          <article className="matter" key={matter.id}>
            <div>
              <h3>{matter.title}</h3>
              <p className="muted">
                {matter.court}{matter.case_number ? ` · ${matter.case_number}` : ''}
              </p>
              {matter.notes && <p>{matter.notes}</p>}
            </div>
            <div className="matter-actions">
              <label>
                Next date
                <input
                  type="date"
                  value={matter.next_hearing || ''}
                  onChange={(event) =>
                    run(() => api.update(matter.id, { next_hearing: event.target.value || null }))
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={matter.status}
                  onChange={(event) => run(() => api.update(matter.id, { status: event.target.value }))}
                >
                  {STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <button className="quiet" onClick={() => deleteMatter(matter)}>Delete</button>
            </div>
          </article>
        ))}

        <nav className="pager" aria-label="Pages">
          <button className="quiet" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button className="quiet" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </div>
  )
}
