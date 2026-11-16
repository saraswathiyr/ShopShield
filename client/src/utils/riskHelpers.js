export function riskTone(level) {
  if (level === 'Low Risk') return 'low'
  if (level === 'Medium Risk') return 'medium'
  if (level === 'High Risk') return 'high'
  return 'neutral'
}

export const FACTORS = [
  { key: 'urlSecurity', title: 'URL security', icon: 'Shield' },
  { key: 'domainAge', title: 'Domain age', icon: 'CalendarClock' },
  { key: 'reputation', title: 'Website reputation', icon: 'Radar' },
  { key: 'priceAnalysis', title: 'Price analysis', icon: 'Tags' },
  { key: 'contentAnalysis', title: 'Website content', icon: 'FileSearch' },
  { key: 'communityReports', title: 'Community reports', icon: 'UsersRound' },
]

export const DISCLAIMER = 'ShopShield provides an automated risk assessment based on available indicators. It does not guarantee that a website is safe or fraudulent. Verify sellers and payment details before making purchases.'
