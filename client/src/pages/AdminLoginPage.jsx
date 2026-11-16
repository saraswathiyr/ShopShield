import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { getReports } from '../api/adminApi'
import { getApiError } from '../api/axiosInstance'
import ErrorMessage from '../components/ErrorMessage'

export default function AdminLoginPage({ onAuthenticated }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    if (!secret.trim() || loading) {
      setError(secret.trim() ? '' : 'Enter the admin key.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await getReports('pending', secret)
      onAuthenticated(secret)
      navigate('/admin/reports', { replace: true })
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <span className="admin-login-icon"><KeyRound size={24} /></span>
        <span className="eyebrow">Restricted area</span>
        <h1>Admin moderation</h1>
        <p>Enter the server-configured admin key to review community submissions.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-secret">Admin key</label>
          <input
            id="admin-secret"
            type="password"
            value={secret}
            onChange={event => { setSecret(event.target.value); setError('') }}
            autoComplete="current-password"
            required
          />
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button button-primary button-wide" type="submit" disabled={loading}>
            {loading ? 'Verifying key…' : <>Continue <ArrowRight size={17} /></>}
          </button>
        </form>
        <div className="admin-security-note"><ShieldCheck size={16} /><span>The key is held in memory for this browser session only. It is not stored in localStorage. Frontend key entry does not replace server-side authentication.</span></div>
      </div>
    </div>
  )
}
