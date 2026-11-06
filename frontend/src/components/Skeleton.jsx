export default function Skeleton({ rows = 3 }) {
  return (
    <div className="skeleton" aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => <span key={row} />)}
    </div>
  )
}
