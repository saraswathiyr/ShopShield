import { riskTone } from '../utils/riskHelpers'

export default function RiskBadge({ level }) {
  return <span className={`risk-badge tone-${riskTone(level)}`}>{level || 'Unknown'}</span>
}
