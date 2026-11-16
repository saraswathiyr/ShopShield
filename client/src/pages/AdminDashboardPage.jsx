import { useCallback, useEffect, useState } from 'react'
import { LogOut, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { getReports, reviewReport } from '../api/adminApi'
import { getApiError } from '../api/axiosInstance'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate } from '../utils/formatters'

const statuses = ['pending', 'approved', 'rejected']

export default function AdminDashboardPage({ adminKey, onLogout }) {
  const [status, setStatus] = useState('pending')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [notes, setNotes] = useState({})

  const loadReports = useCallback(async (nextStatus = status) => {
    setLoading(true)
    setError('')
    try {
      const result = await getReports(nextStatus, adminKey)
      setReports(Array.isArray(result.reports) ? result.reports : [])
    } catch (requestError) {
      const message = getApiError(requestError)
      setError(message)
      if (requestError.response?.status === 401) onLogout()
    } finally {
      setLoading(false)
    }
  }, [adminKey, onLogout, status])

  useEffect(() => {
    loadReports(status)
  }, [loadReports, status])

  async function handleReview(report, decision) {
    const question = decision === 'approved'
      ? 'Approve this report? It may contribute to this website’s community risk score.'
      : 'Reject this report? It will not contribute to community scoring.'
    if (!window.confirm(question)) return

    setBusyId(report._id)
    setActionError('')
    try {
      await reviewReport(report._id, decision, notes[report._id] || '', adminKey)
      await loadReports(status)
    } catch (requestError) {
      setActionError(getApiError(requestError))
    } finally {
      setBusyId('')
    }
  }

  function logout() {
    onLogout()
  }

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-heading">
        <div><span className="eyebrow">ShopShield administration</span><h1>Report moderation</h1><p>Review community submissions. Only approved reports contribute to scoring.</p></div>
        <button className="button button-secondary button-small" onClick={logout}><LogOut size={16} /> Sign out</button>
      </div>
      <div className="admin-security-banner"><ShieldCheck size={17} /><span>Admin key is only kept in memory and will be cleared when you sign out or close this page.</span></div>
      <div className="admin-tabs" role="tablist" aria-label="Report status">
        {statuses.map(item => <button key={item} role="tab" aria-selected={status === item} className={status === item ? 'admin-tab active' : 'admin-tab'} onClick={() => setStatus(item)}>{item}</button>)}
        <button className="button button-secondary button-small refresh-button" onClick={() => loadReports(status)} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <ErrorMessage>{actionError}</ErrorMessage>
      {loading ? <div className="admin-loading"><LoadingSpinner label="Loading reports…" /></div> : reports.length === 0 ? (
        <div className="admin-empty"><span className="empty-history-icon"><ShieldCheck size={23} /></span><h2>No {status} reports</h2><p>There are no reports in this moderation queue right now.</p></div>
      ) : (
        <div className="admin-report-list">
          {reports.map(report => (
            <article className="admin-report-card" key={report._id}>
              <div className="admin-report-heading">
                <div><span className="admin-report-reason">{report.reason}</span><span className={`moderation-status moderation-${report.status}`}>{report.status}</span></div>
                <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
              </div>
              <h2>{report.domain}</h2>
              <a className="report-site-url" href={`https://${report.domain}`} target="_blank" rel="noreferrer">{report.domain}</a>
              {report.description && <p className="admin-report-description">{report.description}</p>}
              <div className="admin-report-meta"><span>Submitted: {formatDate(report.createdAt)}</span>{report.reviewedAt && <span>Reviewed: {formatDate(report.reviewedAt)}</span>}</div>
              {report.reviewNote && <div className="review-note"><strong>Moderator note</strong><p>{report.reviewNote}</p></div>}
              {report.status === 'pending' && (
                <div className="moderation-actions">
                  <label htmlFor={`note-${report._id}`}>Review note <span className="optional-label">Optional, max 500 characters</span></label>
                  <textarea id={`note-${report._id}`} rows="2" maxLength={500} value={notes[report._id] || ''} onChange={event => setNotes(current => ({ ...current, [report._id]: event.target.value }))} placeholder="Add context for this decision" />
                  <div className="moderation-buttons">
                    <button className="button button-danger" disabled={Boolean(busyId)} onClick={() => handleReview(report, 'rejected')}>
                      {busyId === report._id ? 'Saving…' : <><X size={16} /> Reject</>}
                    </button>
                    <button className="button button-primary" disabled={Boolean(busyId)} onClick={() => handleReview(report, 'approved')}>
                      {busyId === report._id ? 'Saving…' : <><ShieldCheck size={16} /> Approve</>}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
