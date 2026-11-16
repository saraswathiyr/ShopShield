import { ShieldCheck } from 'lucide-react'
import RiskBadge from './RiskBadge'

export default function RiskScoreCard({ scan, finalUrl }) {
  const score = Number.isFinite(scan?.riskScore) ? scan.riskScore : null
  const tone = scan?.riskLevel === 'Low Risk'
    ? 'low'
    : scan?.riskLevel === 'Medium Risk'
      ? 'medium'
      : scan?.riskLevel === 'High Risk'
        ? 'high'
        : 'neutral'

  return (
    <section className={`score-card tone-${tone}`}>
      <div className="score-main">
        <div
          className="score-ring"
          style={{ '--score': `${score ?? 0}%` }}
          role="img"
          aria-label={score === null ? 'Risk score unavailable' : `Risk score ${score} out of 100`}
        >
          <div className="score-ring-inner">
            <strong>{score ?? '—'}</strong>
            <span>out of 100</span>
          </div>
        </div>
        <div className="score-copy">
          <span className="eyebrow"><ShieldCheck size={15} /> Website assessment</span>
          <h1>Scan results</h1>
          <RiskBadge level={scan?.riskLevel || 'Unknown'} />
          <p className="scanned-url" title={finalUrl}>{finalUrl}</p>
          <p className="domain-line">Domain: <strong>{scan?.website?.domain || 'Not available'}</strong></p>
        </div>
      </div>
      <div className="score-stats">
        <div><strong>{scan?.confidence ?? 0}%</strong><span>Confidence</span></div>
        <div><strong>{scan?.completedFactors ?? 0}<small> / {scan?.totalFactors ?? 6}</small></strong><span>Factors completed</span></div>
        <div><strong>{scan?.analysisStatus || 'unavailable'}</strong><span>Analysis status</span></div>
      </div>
    </section>
  )
}
