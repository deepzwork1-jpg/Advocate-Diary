import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Download, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorNote from '../components/ErrorNote.jsx'
import MatterForm from '../components/MatterForm.jsx'
import Modal from '../components/Modal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pager from '../components/Pager.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useLoad } from '../hooks/useLoad.js'
import { shortDate } from '../lib/format.js'

const PAGE_SIZE = 8

export default function MattersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)

  const filters = () => {
    const params = {}
    if (search.trim()) params.q = search.trim()
    if (statusFilter) params.status = statusFilter
    return params
  }

  const { data, error } = useLoad(
    () => api.listMatters({ ...filters(), page, page_size: PAGE_SIZE }),
    [page, search, statusFilter]
  )

  const addMatter = async (matter) => {
    const created = await api.createMatter(matter)
    toast.success('Matter added')
    navigate(`/matters/${created.id}`)
  }

  const exportCsv = async () => {
    try {
      const url = URL.createObjectURL(await api.exportMatters(filters()))
      const link = document.createElement('a')
      link.href = url
      link.download = 'matters.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const resetPageAnd = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  return (
    <>
      <PageHeader title="Matters" subtitle={data ? `${data.total} in view` : ' '}>
        <button className="secondary" onClick={exportCsv}><Download size={16} />Export CSV</button>
        <button onClick={() => setAdding(true)}><Plus size={16} />New matter</button>
      </PageHeader>
      <ErrorNote message={error} />

      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input
              aria-label="Search matters"
              placeholder="Search title, court or case number"
              value={search}
              onChange={resetPageAnd(setSearch)}
            />
          </div>
          <select aria-label="Filter by status" value={statusFilter} onChange={resetPageAnd(setStatusFilter)}>
            <option value="">All statuses</option>
            <option>active</option>
            <option>adjourned</option>
            <option>closed</option>
          </select>
        </div>

        {!data ? <Skeleton rows={6} /> : data.items.length === 0 ? (
          <EmptyState icon={Briefcase} title="No matters found" hint="Try another search, or add a new matter." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matter</th>
                  <th>Court</th>
                  <th>Next hearing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((matter) => (
                  <tr key={matter.id}>
                    <td>
                      <Link to={`/matters/${matter.id}`}><strong>{matter.title}</strong></Link>
                      {matter.case_number && <small className="muted">{matter.case_number}</small>}
                    </td>
                    <td>{matter.court}</td>
                    <td>{matter.next_hearing ? shortDate(matter.next_hearing) : <span className="muted">Not set</span>}</td>
                    <td><StatusBadge value={matter.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={page} totalPages={Math.ceil(data.total / PAGE_SIZE)} onChange={setPage} />}
      </section>

      {adding && (
        <Modal title="New matter" onClose={() => setAdding(false)}>
          <MatterForm onSubmit={addMatter} onCancel={() => setAdding(false)} />
        </Modal>
      )}
    </>
  )
}
