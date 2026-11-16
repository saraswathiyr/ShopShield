import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, FileSearch, Globe2, LockKeyhole,
  MessageSquareText, Radar, ShieldCheck, ShoppingBag, Tags, UsersRound,
} from 'lucide-react'
import { validateWebsiteUrl } from '../utils/validators'
import ErrorMessage from '../components/ErrorMessage'

const factors = [
  { icon: ShieldCheck, title: 'URL security', text: 'HTTPS, IP addresses, suspicious domains and possible brand impersonation.' },
  { icon: Globe2, title: 'Domain age', text: 'Registration age indicators help add context to a new storefront.' },
  { icon: Radar, title: 'Website reputation', text: 'Available threat intelligence from reputation services.' },
  { icon: Tags, title: 'Price analysis', text: 'Product price signals and unusually steep advertised discounts.' },
  { icon: FileSearch, title: 'Website content', text: 'Contact details, business identity, policies and page evidence.' },
  { icon: UsersRound, title: 'Community reports', text: 'Recent, approved community claims about a website.' },
]

export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function startScan(event) {
    event.preventDefault()
    const validation = validateWebsiteUrl(url)
    if (validation) {
      setError(validation)
      return
    }
    navigate('/scan', { state: { url: url.trim() } })
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><span className="pulse-dot" /> A clearer way to shop online</span>
          <h1>Shop smart.<br /><span>Stay safe.</span></h1>
          <p>Identify suspicious online shopping websites before making a purchase. Review security, domain age, reputation, pricing, content and community reports in one place.</p>
          <form className="scan-form hero-scan-form" onSubmit={startScan} noValidate>
            <label className="visually-hidden" htmlFor="hero-url">Shopping website URL</label>
            <Globe2 size={20} aria-hidden="true" />
            <input id="hero-url" value={url} onChange={event => { setUrl(event.target.value); setError('') }} placeholder="Paste a shopping website URL" autoComplete="url" />
            <button className="button button-primary" type="submit">Check website <ArrowRight size={17} /></button>
          </form>
          <ErrorMessage>{error}</ErrorMessage>
          <div className="hero-reassurance"><LockKeyhole size={15} /> No account needed <span /> Your URL is checked by our backend</div>
        </div>
        <div className="hero-visual" aria-label="ShopShield website risk assessment illustration">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-shield"><ShieldCheck size={82} strokeWidth={1.4} /></div>
          <div className="floating-card floating-card-top"><span className="floating-icon icon-green"><BadgeCheck size={18} /></span><span><strong>Six-factor review</strong><small>Evidence-led checks</small></span></div>
          <div className="floating-card floating-card-bottom"><span className="floating-icon icon-blue"><Radar size={18} /></span><span><strong>Risk insights</strong><small>Clear, understandable results</small></span></div>
          <div className="visual-caption">Know more before checkout</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="ShopShield approach">
        <div><ShieldCheck size={19} /><span>Evidence, not guesswork</span></div>
        <div><LockKeyhole size={19} /><span>Safer checks by design</span></div>
        <div><MessageSquareText size={19} /><span>Community-informed</span></div>
      </section>

      <section className="section-block how-section">
        <div className="section-heading">
          <span className="eyebrow">How it works</span>
          <h2>A little more confidence before you buy.</h2>
          <p>ShopShield combines multiple available signals into a transparent assessment. You can inspect the evidence behind every factor.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><ShoppingBag size={24} /><h3>Share a store URL</h3><p>Paste the website you’re considering. We only scan the URL you submit.</p></article>
          <article className="step-card"><span className="step-number">02</span><Radar size={24} /><h3>Review available signals</h3><p>Six factors are checked; unavailable sources stay clearly marked unavailable.</p></article>
          <article className="step-card"><span className="step-number">03</span><FileSearch size={24} /><h3>Understand the result</h3><p>See a risk level, confidence and the supporting evidence for each factor.</p></article>
        </div>
      </section>

      <section className="section-block factors-section">
        <div className="section-heading">
          <span className="eyebrow">Six detection factors</span>
          <h2>More context. In one assessment.</h2>
          <p>Each factor contributes only when its check is available. A missing result is never presented as proof of safety.</p>
        </div>
        <div className="factor-overview-grid">
          {factors.map(({ icon: Icon, title, text }) => (
            <article className="overview-card" key={title}>
              <span className="overview-icon"><Icon size={21} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="risk-guide">
        <div><span className="eyebrow">Risk classification</span><h2>Understand the score, not just the color.</h2><p>Scores are heuristic assessments based on available indicators. A low score does not guarantee a store is legitimate.</p></div>
        <div className="risk-levels">
          <div className="risk-level level-low"><span /> <strong>Low Risk</strong><small>0–30</small></div>
          <div className="risk-level level-medium"><span /> <strong>Medium Risk</strong><small>31–60</small></div>
          <div className="risk-level level-high"><span /> <strong>High Risk</strong><small>61–100</small></div>
        </div>
      </section>

      <section className="community-callout">
        <div className="callout-icon"><UsersRound size={25} /></div>
        <div><span className="eyebrow">Community reports</span><h2>Help make shopping safer for everyone.</h2><p>Submit suspicious website reports for moderation. Only approved reports contribute to community scoring.</p></div>
        <Link className="button button-secondary" to="/report">Report a website <ArrowRight size={17} /></Link>
      </section>

      <section className="privacy-note"><LockKeyhole size={19} /><p><strong>Security and privacy:</strong> website fetching is protected against unsafe network destinations. ShopShield provides an assessment, not a guarantee—verify sellers and payment details before purchasing.</p></section>
    </>
  )
}
