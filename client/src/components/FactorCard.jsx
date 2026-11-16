import { useState } from 'react'
import {
  AlertTriangle, CalendarClock, ChevronDown, FileSearch, Globe2,
  Radar, Shield, Tags, UsersRound,
} from 'lucide-react'
import { FACTORS } from '../utils/riskHelpers'
import { displayValue, formatDate, formatPrice } from '../utils/formatters'

const icons = { Shield, CalendarClock, Radar, Tags, FileSearch, UsersRound }
const titlesByKey = Object.fromEntries(FACTORS.map(item => [item.key, item.title]))

function Detail({ label, value }) {
  return <div className="evidence-detail"><span>{label}</span><strong>{value}</strong></div>
}

function StringList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return <span className="muted">None reported</span>
  return <ul className="evidence-list">{items.map((item, index) => <li key={`${item}-${index}`}>{String(item)}</li>)}</ul>
}

function Evidence({ factorKey, evidence = {} }) {
  const reputationSources = evidence.sources || []
  const discovery = evidence.domainPageDiscovery

  if (factorKey === 'urlSecurity') {
    return (
      <div className="evidence-grid">
        <Detail label="Protocol" value={evidence.protocol || 'Not available'} />
        <Detail label="Hostname" value={evidence.hostname || 'Not available'} />
        <Detail label="Domain" value={evidence.domain || 'Not available'} />
        <Detail label="IP address" value={displayValue(evidence.isIP)} />
        <Detail label="TLD" value={evidence.tld || 'Not available'} />
        <Detail label="Hyphens" value={displayValue(evidence.hyphenCount)} />
        <Detail label="Subdomains" value={displayValue(evidence.subdomainCount)} />
        <div className="evidence-detail wide"><span>Brand matches</span>
          {Array.isArray(evidence.brandMatches) && evidence.brandMatches.length
            ? <StringList items={evidence.brandMatches.map(match => `${match.brand} · ${match.type} (${match.similarity})`)} />
            : <strong>None reported</strong>}
        </div>
      </div>
    )
  }

  if (factorKey === 'domainAge') {
    return <div className="evidence-grid">
      <Detail label="Registration date" value={formatDate(evidence.registrationDate)} />
      <Detail label="Age in days" value={displayValue(evidence.ageInDays)} />
      <Detail label="Age in years" value={displayValue(evidence.ageInYears)} />
      <Detail label="Registration status" value={evidence.status || 'Not available'} />
      {evidence.message && <Detail label="Details" value={evidence.message} />}
    </div>
  }

  if (factorKey === 'reputation') {
    return (
      <div className="source-list">
        {reputationSources.length === 0 && <span className="muted">No provider details were returned.</span>}
        {reputationSources.map(source => (
          <div className="source-row" key={source.source}>
            <div className="source-heading">
              <strong>{source.source}</strong>
              <span className={`source-status ${source.failed ? 'status-unavailable' : source.status === 'pending-analysis' ? 'status-pending' : 'status-complete'}`}>
                  {(source.status || 'unavailable').replaceAll('-', ' ')}
              </span>
            </div>
              {typeof source.malicious === 'boolean' && <Detail label="Threat found" value={displayValue(source.malicious)} />}
              {typeof source.malicious === 'number' && <Detail label="Malicious detections" value={source.malicious} />}
              {source.detections !== undefined && <Detail label="Matches" value={source.detections} />}
            {source.suspicious !== undefined && <Detail label="Suspicious detections" value={source.suspicious} />}
            {source.harmless !== undefined && <Detail label="Harmless" value={source.harmless} />}
            {source.undetected !== undefined && <Detail label="Undetected" value={source.undetected} />}
            {source.analysisId && <Detail label="Analysis ID" value={source.analysisId} />}
            {source.message && <p className="source-message">{source.message}</p>}
            {source.status === 'pending-analysis' && <p className="source-message">Analysis is still pending and is not counted as a clean result.</p>}
          </div>
        ))}
      </div>
    )
  }

  if (factorKey === 'priceAnalysis') {
    return <div className="evidence-grid">
      <Detail label="Selling price" value={formatPrice(evidence.sellingPrice, evidence.currency)} />
      <Detail label="Original price" value={formatPrice(evidence.originalPrice, evidence.currency)} />
      <Detail label="Discount" value={evidence.discountPercent == null ? 'Not available' : `${evidence.discountPercent}%`} />
      <Detail label="Currency" value={evidence.currency || 'Not available'} />
      <Detail label="Status" value={evidence.status || 'Not available'} />
      <Detail label="Extraction source" value={evidence.extractionSource || 'Not available'} />
    </div>
  }

  if (factorKey === 'contentAnalysis') {
    return <>
      <div className="evidence-grid">
        <Detail label="Pages analyzed" value={displayValue(evidence.pagesAnalyzed)} />
        <Detail label="Email found" value={displayValue(evidence.contactInformation?.emailFound)} />
        <Detail label="Phone found" value={displayValue(evidence.contactInformation?.phoneFound)} />
        <Detail label="Business information" value={displayValue(evidence.businessInformationFound)} />
        <Detail label="Contact page" value={displayValue(evidence.contactPageFound)} />
        <Detail label="Privacy policy" value={displayValue(evidence.privacyPolicyFound)} />
        <Detail label="Refund policy" value={displayValue(evidence.refundPolicyFound)} />
      </div>
      <div className="evidence-columns">
        <div><span className="evidence-label">Suspicious payment phrases</span><StringList items={evidence.suspiciousPaymentPhrases} /></div>
        <div><span className="evidence-label">Urgency phrases</span><StringList items={evidence.urgencyPhrasesFound} /></div>
      </div>
      {discovery && (
        <div className="discovery-summary">
          <Globe2 size={16} />
          <span>Page discovery {discovery.success ? 'completed' : 'unavailable'} · {discovery.pagesAnalyzed ?? 0} of up to {discovery.maximumPages ?? 6} pages</span>
          {Array.isArray(discovery.failedPages) && discovery.failedPages.length > 0 && (
            <details className="failed-pages">
              <summary>{discovery.failedPages.length} page fetch(es) failed</summary>
              {discovery.failedPages.map((page, index) => (
                <p key={`${page.url}-${index}`}><strong>{page.url}</strong> — {page.reason}</p>
              ))}
            </details>
          )}
        </div>
      )}
    </>
  }

  if (factorKey === 'communityReports') {
    return <>
      <div className="evidence-grid">
        <Detail label="Approved reports" value={displayValue(evidence.totalApprovedReports)} />
        <Detail label="Distinct claims" value={displayValue(evidence.distinctApprovedClaims)} />
        <Detail label="Reporting window" value={displayValue(evidence.reportWindowDays, ' days')} />
      </div>
      {Array.isArray(evidence.reports) && evidence.reports.length > 0 && (
        <div className="approved-reports">
          <span className="evidence-label">Approved report details</span>
          {evidence.reports.map((report, index) => (
            <div className="approved-report" key={`${report.reason}-${report.createdAt}-${index}`}>
              <strong>{report.reason}</strong>
              {report.description && <p>{report.description}</p>}
              <span>{formatDate(report.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {evidence.error && <p className="source-message">{evidence.error}</p>}
    </>
  }
  return <span className="muted">No additional evidence was returned.</span>
}

export default function FactorCard({ factorKey, factor = {} }) {
  const [expanded, setExpanded] = useState(false)
  const info = FACTORS.find(item => item.key === factorKey)
  const Icon = icons[info?.icon] || AlertTriangle
  const unavailable = factor.status !== 'completed'
  const reasons = Array.isArray(factor.reasons) ? factor.reasons : []

  return (
    <article className={`factor-card ${unavailable ? 'factor-unavailable' : ''}`}>
      <div className="factor-top">
        <span className="factor-icon"><Icon size={20} /></span>
        <div className="factor-title">
          <h3>{factor.name || titlesByKey[factorKey] || factorKey}</h3>
          <span className={`factor-status ${unavailable ? 'status-unavailable' : 'status-complete'}`}>
            {factor.status || 'unavailable'}
          </span>
        </div>
        <div className="factor-score">
          <strong>{factor.points == null ? '—' : factor.points}</strong>
          <span>{factor.maximumPoints == null ? 'points' : `of ${factor.maximumPoints} pts`}</span>
        </div>
      </div>
      <div className="factor-weight">Factor weight <strong>{factor.weight ?? '—'}%</strong></div>
      {unavailable && <p className="factor-unavailable-note">This check was unavailable and is not presented as a clean result.</p>}
      {reasons.length > 0 && (
        <ul className="reason-list">{reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul>
      )}
      <button
        className="evidence-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        {expanded ? 'Hide evidence' : 'View evidence'}
        <ChevronDown className={expanded ? 'rotate-icon' : ''} size={16} />
      </button>
      {expanded && <div className="evidence-panel"><Evidence factorKey={factorKey} evidence={factor.evidence} /></div>}
    </article>
  )
}
