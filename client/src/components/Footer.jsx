import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark"><ShieldCheck size={18} /></span>
          <span>shopshield<span className="brand-dot">.</span></span>
        </Link>
        <p>Smarter checks for safer shopping.</p>
        <div className="footer-links">
          <Link to="/scan">Scan a website</Link>
          <Link to="/report">Community report</Link>
        </div>
        <span className="copyright">© {new Date().getFullYear()} ShopShield</span>
      </div>
    </footer>
  )
}
