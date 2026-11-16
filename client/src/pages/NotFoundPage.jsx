import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <section className="empty-result-card">
      <span className="empty-history-icon"><SearchX size={24} /></span>
      <span className="eyebrow">Page not found</span>
      <h1>We couldn’t find that page.</h1>
      <p>The address may be outdated or incorrect.</p>
      <Link className="button button-primary" to="/"><ArrowLeft size={16} /> Return home</Link>
    </section>
  )
}
