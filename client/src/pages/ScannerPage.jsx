import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Globe2, Info, Radar, ShieldCheck, X } from 'lucide-react'
import { scanWebsite } from '../api/scanApi'
import { getApiError } from '../api/axiosInstance'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import { validateWebsiteUrl } from '../utils/validators'

export default function ScannerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [url, setUrl] = useState(location.state?.url || '')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (location.state?.url) setUrl(location.state.url)
  }, [location.state])

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    const validation = validateWebsiteUrl(url)
    setFieldError(validation)
    setError('')
    if (validation) return

    setLoading(true)
    try {
      const response = await scanWebsite(url.trim())
      if (!response?.success || !response.scan) {
        throw new Error(response?.message || 'The server did not return a scan result.')
      }
      navigate('/results', { state: { response } })
    } catch (requestError) {
      setError(requestError.response ? getApiError(requestError) : requestError.message || getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scanner-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={16} /> Back to dashboard</Link>
      <div className="scanner-heading">
        <span className="page-icon"><Radar size={24} /></span>
        <span className="eyebrow">Website scanner</span>
        <h1>Check a shopping website</h1>
        <p>Enter the URL you’re considering. ShopShield will fetch the site safely and assess the signals available.</p>
      </div>
      <form className="scanner-panel" onSubmit={handleSubmit} noValidate>
        <label htmlFor="scan-url">Website URL</label>
        <div className={`input-with-icon ${fieldError ? 'input-error' : ''}`}>
          <Globe2 size={19} aria-hidden="true" />
          <input
            id="scan-url"
            type="url"
            value={url}
            onChange={event => { setUrl(event.target.value); setFieldError(''); setError('') }}
            placeholder="https://example.com"
            autoComplete="url"
            maxLength={2048}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? 'scan-url-error' : 'scan-url-help'}
            disabled={loading}
          />
          {url && !loading && <button className="clear-input" type="button" aria-label="Clear URL" onClick={() => { setUrl(''); setFieldError(''); setError('') }}><X size={17} /></button>}
        </div>
        {fieldError
          ? <span id="scan-url-error" className="field-error">{fieldError}</span>
          : <span id="scan-url-help" className="field-hint">Include http:// or https:// in the address.</span>}
        <button className="button button-primary button-wide" type="submit" disabled={loading}>
          {loading ? <LoadingSpinner inline label="Scanning website…" /> : <>Start scan <ArrowRight size={17} /></>}
        </button>
        <ErrorMessage>{error}</ErrorMessage>
      </form>
      <div className="scan-process">
        <div><span><ShieldCheck size={17} /></span><p><strong>Secure request</strong><small>Unsafe destinations are blocked by the backend.</small></p></div>
        <div><span><Radar size={17} /></span><p><strong>Multiple signals</strong><small>Unavailable checks are disclosed, not treated as clean.</small></p></div>
        <div><span><Info size={17} /></span><p><strong>Transparent result</strong><small>Review the evidence and its limitations.</small></p></div>
      </div>
      <p className="scanner-disclaimer">A low risk score does not guarantee that a website is legitimate. Avoid entering sensitive information on sites you do not trust.</p>
    </div>
  )
}
