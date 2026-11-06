import { AlertTriangle, CheckSquare, Percent } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api.js'
import ErrorNote from '../components/ErrorNote.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StatCard from '../components/StatCard.jsx'
import { useLoad } from '../hooks/useLoad.js'

const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12 }
const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
}

function ChartTable({ rows, heading }) {
  return (
    <details className="chart-table">
      <summary>View as table</summary>
      <table>
        <thead><tr><th>{heading}</th><th>Count</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}
        </tbody>
      </table>
    </details>
  )
}

function ChartCard({ title, rows, heading, vertical = false }) {
  const height = vertical ? Math.max(180, rows.length * 44) : 240
  return (
    <section className="card">
      <div className="card-title"><h2>{title}</h2></div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout={vertical ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 12, bottom: 0, left: vertical ? 8 : -20 }}
          >
            <CartesianGrid stroke="var(--border)" horizontal={!vertical} vertical={vertical} />
            {vertical ? (
              <>
                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={130} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              </>
            )}
            <Tooltip
              cursor={{ fill: 'var(--hover)' }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'var(--text)' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Bar
              dataKey="count"
              name="Count"
              fill="var(--chart)"
              maxBarSize={32}
              radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable rows={rows} heading={heading} />
    </section>
  )
}

export default function AnalyticsPage() {
  const { data, error } = useLoad(() => api.analytics(), [])

  return (
    <>
      <PageHeader title="Analytics" subtitle="How your practice is moving." />
      <ErrorNote message={error} />

      {!data ? <Skeleton rows={6} /> : (
        <>
          <section className="stat-grid three" aria-label="Summary">
            <StatCard icon={Percent} label="Hearings adjourned" value={`${data.adjournment_rate}%`} tone="amber" />
            <StatCard icon={CheckSquare} label="Open tasks" value={data.open_tasks} />
            <StatCard icon={AlertTriangle} label="Overdue tasks" value={data.overdue_tasks} tone="red" />
          </section>
          <div className="two-columns">
            <ChartCard title="Hearings per month" rows={data.hearings_by_month} heading="Month" />
            <ChartCard title="Matters by court" rows={data.by_court} heading="Court" vertical />
          </div>
          <ChartCard title="Matters by status" rows={data.by_status} heading="Status" vertical />
        </>
      )}
    </>
  )
}
