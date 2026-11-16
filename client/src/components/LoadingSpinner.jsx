import { LoaderCircle } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading', inline = false }) {
  return (
    <span className={`loading-state ${inline ? 'loading-inline' : ''}`} role="status">
      <LoaderCircle className="spinner" size={19} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
