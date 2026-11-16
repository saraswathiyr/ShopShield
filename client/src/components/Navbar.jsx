import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ShieldCheck, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/scan', label: 'Scan a site' },
  { to: '/report', label: 'Report a site' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-mark"><ShieldCheck size={21} strokeWidth={2.4} /></span>
          <span>shopshield<span className="brand-dot">.</span></span>
        </Link>
        <button
          className="icon-button mobile-menu"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink className="admin-nav-link" to="/admin">Admin</NavLink>
        </nav>
      </div>
    </header>
  )
}
