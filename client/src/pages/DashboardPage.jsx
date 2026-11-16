import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, FileSearch, Globe2, MessageSquareText, Radar, ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { getApiError } from '../api/axiosInstance'
import { getApiHealth } from '../api/scanApi'
import LoadingSpinner from '../components/LoadingSpinner'

const factorNames = [
  'URL security', 'Domain age', 'Website reputation',
  'Price analysis', 'Website content', 'Community reports',
]

export default function DashboardPage() {
  const [health, setHealth] = useState('checking')
  const [healthError, setHealthError] = useState('')

  useEffect(() => {
    let active = true
    getApiHealth()
      .then(() => { if (active) setHealth('online') })
      .catch(error => {
        if (active) {
          setHealth('offline')
          setHealthError(getApiError(error))
        }
      })
    return () => { active = false }
  }, [])

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">Your ShopShield dashboard</span>
          <h1>Make your next purchase with more context.</h1>
          <p>Check a shopping website, understand the signals, and share concerns with the community.</p>
        </div>
        <div className={`service-status service-${health}`} role="status">
          <span className="status-dot" />
          {health === 'checking' ? <LoadingSpinner inline label="Checking API" /> : health === 'online' ? 'ShopShield API is reachable' : 'ShopShield API is unavailable'}
        </div>
      </section>
      {healthError && <p className="inline-hint">{healthError}</p>}

      <section className="dashboard-action-grid">
        <article className="dashboard-action-card scan-action">
          <span className="action-icon"><Radar size={23} /></span>
          <span className="eyebrow">Website scanner</span>
          <h2>Have a store in mind?</h2>
          <p>Get a live, six-factor assessment from the ShopShield backend.</p>
          <Link className="button button-primary" to="/scan">Scan a website <ArrowRight size={17} /></Link>
        </article>
        <article className="dashboard-action-card report-action">
          <span className="action-icon"><MessageSquareText size={23} /></span>
          <span className="eyebrow">Community reports</span>
          <h2>See something suspicious?</h2>
          <p>Submit a report for review. Reports are moderated before they affect scoring.</p>
          <Link className="button button-secondary" to="/report">Submit a report <ArrowRight size={17} /></Link>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-title-row"><div><span className="eyebrow">What we check</span><h2>Six signals, one clearer picture</h2></div><Link to="/" className="text-link">How it works <ArrowRight size={15} /></Link></div>
        <div className="dashboard-factor-grid">
          {factorNames.map((name, index) => {
            const icons = [ShieldCheck, Globe2, Radar, FileSearch, FileSearch, UsersRound]
            const Icon = icons[index]
            return <div className="dashboard-factor" key={name}><Icon size={18} /><span>{name}</span></div>
          })}
        </div>
      </section>

      <section className="empty-history-card">
        <div className="empty-history-icon"><FileSearch size={23} /></div>
        <div><h2>No scan history is stored</h2><p>This backend does not provide persistent scan history. Your results appear after a scan and are not represented here as stored records.</p></div>
        <Link to="/scan" className="text-link">Start a scan <ArrowRight size={15} /></Link>
      </section>
      <p className="dashboard-disclaimer"><ShieldCheck size={16} /> Risk scores are automated indicators, not a guarantee of safety or fraud. Verify sellers and payment details before purchase.</p>
    </div>
  )
}
