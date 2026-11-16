import { AlertCircle, X } from 'lucide-react'

export default function ErrorMessage({ children, onDismiss }) {
  if (!children) return null
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <span>{children}</span>
      {onDismiss && (
        <button className="notice-dismiss" onClick={onDismiss} aria-label="Dismiss error">
          <X size={17} />
        </button>
      )}
    </div>
  )
}
