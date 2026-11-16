import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Copy, Printer, RotateCw, ShieldAlert } from 'lucide-react'
import FactorCard from '../components/FactorCard'
import RiskScoreCard from '../components/RiskScoreCard'
import { DISCLAIMER, FACTORS } from '../utils/riskHelpers'

export default function ScanResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const response = state?.response
  const scan = response?.scan
  const [copied, setCopied] = useState(false)

  if (!scan) {
    return (
      <section className="empty-result-card">
        <span className="empty-history-icon"><ShieldAlert size={25} /></span>
        <h1>No scan result to show</h1>
        <p>Scan results are not stored by the backend. Start a new scan to see a live assessment.</p>
        <Link className="button button-primary" to="/scan">Scan a website <ArrowRight size={17} /></Link>
      </section>
    )
  }

  const factors = scan.factors || {}
  const finalUrl = response.finalUrl || scan.website?.url || response.requestedUrl || ''

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(finalUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="results-page">
      <Link className="back-link" to="/scan"><ArrowLeft size={16} /> Scan another website</Link>
      <RiskScoreCard scan={scan} finalUrl={finalUrl} />
      <div className="results-actions">
        <button className="button button-secondary button-small" onClick={copyUrl} type="button">
          {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy URL'}
        </button>
        <button className="button button-secondary button-small" onClick={() => window.print()} type="button"><Printer size={16} /> Print report</button>
        <button className="button button-primary button-small" onClick={() => navigate('/scan', { state: { url: finalUrl } })} type="button"><RotateCw size={16} /> Re-scan</button>
      </div>
      {(scan.riskScore === null || scan.riskLevel === 'Unknown') && (
        <div className="notice notice-info" role="status"><ShieldAlert size={18} /><span>No reliable overall score was available because the backend could not complete enough checks.</span></div>
      )}
      <section className="factor-results-section">
        <div className="section-title-row">
          <div><span className="eyebrow">Detailed analysis</span><h2>Six-factor assessment</h2><p>Each factor shows its returned points, status, reasons, and evidence.</p></div>
          <span className="factor-count">{scan.completedFactors ?? 0} / {scan.totalFactors ?? 6} completed</span>
        </div>
        <div className="factor-results-grid">
          {FACTORS.map(item => (
            <FactorCard key={item.key} factorKey={item.key} factor={factors[item.key] || { name: item.title, status: 'unavailable', points: null, reasons: ['No result was returned for this check.'], evidence: {} }} />
          ))}
        </div>
      </section>
      <div className="results-disclaimer"><ShieldAlert size={18} /><p>{DISCLAIMER}</p></div>
    </div>
  )
}
