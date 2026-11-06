import { AlertCircle } from 'lucide-react'

export default function ErrorNote({ message }) {
  if (!message) return null
  return (
    <p className="error" role="alert">
      <AlertCircle size={16} />
      {message}
    </p>
  )
}
