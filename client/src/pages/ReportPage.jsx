import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, MessageSquareText, ShieldCheck } from 'lucide-react'
import { submitReport } from '../api/reportApi'
import { getApiError } from '../api/axiosInstance'
import ErrorMessage from '../components/ErrorMessage'
import { validateWebsiteUrl } from '../utils/validators'

const reasons = [
  'Fake payment page',
  'Fake discounts',
  'Phishing',
  'Product scam',
  'Non-delivery',
  'Other',
]

export default function ReportPage() {
  const [form, setForm] = useState({ url: '', reason: '', description: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }))
    setFieldErrors(current => ({ ...current, [field]: '' }))
    setError('')
    setSuccess(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    const errors = {}
    const urlError = validateWebsiteUrl(form.url)
    if (urlError) errors.url = urlError
    if (!form.reason) errors.reason = 'Choose the reason that best describes your report.'
    if (form.description.length > 500) errors.description = 'Description must be 500 characters or fewer.'
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length) return

    setLoading(true)
    try {
      const result = await submitReport({
        url: form.url.trim(),
        reason: form.reason,
        description: form.description.trim(),
      })
      setSuccess(result.report)
      setForm({ url: '', reason: '', description: '' })
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="report-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={16} /> Back to dashboard</Link>
      <div className="report-heading">
        <span className="page-icon"><MessageSquareText size={23} /></span>
        <span className="eyebrow">Community safety</span>
        <h1>Report a suspicious website</h1>
        <p>Your report helps others make informed decisions. Every submission is reviewed before it can affect the community score.</p>
      </div>
      {success && (
        <div className="report-success" role="status">
          <CheckCircle2 size={22} />
          <div><strong>Report submitted for review</strong><p>{success.domain} · {success.reason} · Status: {success.status}</p><small>It will not contribute to any score unless approved by a moderator.</small></div>
        </div>
      )}
      <form className="report-form-panel" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="report-url">Website URL <span className="required-mark">*</span></label>
          <input id="report-url" type="url" value={form.url} onChange={event => update('url', event.target.value)} placeholder="https://example.com" maxLength={2048} autoComplete="url" aria-invalid={Boolean(fieldErrors.url)} />
          {fieldErrors.url && <span className="field-error">{fieldErrors.url}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="report-reason">What happened? <span className="required-mark">*</span></label>
          <select id="report-reason" value={form.reason} onChange={event => update('reason', event.target.value)} aria-invalid={Boolean(fieldErrors.reason)}>
            <option value="">Select a reason</option>
            {reasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
          </select>
          {fieldErrors.reason && <span className="field-error">{fieldErrors.reason}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="report-description">Additional details <span className="optional-label">Optional</span></label>
          <textarea id="report-description" rows="5" maxLength={500} value={form.description} onChange={event => update('description', event.target.value)} placeholder="Share what you observed. Please do not include sensitive personal information." aria-invalid={Boolean(fieldErrors.description)} />
          <div className="field-meta">{fieldErrors.description ? <span className="field-error">{fieldErrors.description}</span> : <span>Keep it factual and avoid sharing personal details.</span>}<span>{form.description.length}/500</span></div>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button button-primary button-wide" type="submit" disabled={loading}>
          {loading ? 'Submitting report…' : <>Submit report <ArrowRight size={17} /></>}
        </button>
      </form>
      <div className="report-review-note"><ShieldCheck size={18} /><p><strong>Moderation first.</strong> Submissions enter a pending state. Only approved reports are used in ShopShield’s community risk factor. Similar reports within 24 hours may be rejected as duplicates.</p></div>
    </div>
  )
}
