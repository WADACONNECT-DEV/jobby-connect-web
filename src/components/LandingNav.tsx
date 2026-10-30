import { Link } from 'react-router-dom'

/* Top navigation for the public landing pages (design V3).
   `active` says which page we're on: that half of the pill switch is
   highlighted and scrolls within the page; the other half links across.
   The provider version also gets the PROVIDERS badge and provider wording;
   its dark colours come from `.lp--providers` in index.css. */
export function LandingNav({ active }: { active: 'customers' | 'providers' }) {
  const onCustomers = active === 'customers'
  return (
    <header className="lp-nav">
      <nav aria-label="Main" className="lp-nav-in">
        <Link to="/" className="lp-logo">
          <span className="lp-logo-j" aria-hidden="true">J</span>
          <span className="lp-logo-name">JOBBY-CONNECT</span>
          {!onCustomers && <span className="lp-logo-badge">PROVIDERS</span>}
        </Link>

        <div className="lp-nav-mid">
          <a href="#how" className="lp-nav-link">How it works</a>
          <span className="lp-pill">
            {onCustomers ? (
              <a href="#get" aria-current="page">For customers</a>
            ) : (
              <Link to="/">For customers</Link>
            )}
            {onCustomers ? (
              <Link to="/for-providers">For providers</Link>
            ) : (
              <a href="#get" aria-current="page">For providers</a>
            )}
          </span>
        </div>

        <div className="lp-nav-end">
          <Link to="/login" className="lp-nav-login">{onCustomers ? 'Log in' : 'Provider log in'}</Link>
          <Link to="/register" className="lp-btn-nav">{onCustomers ? 'Create a free account' : 'Start as a provider'}</Link>
        </div>
      </nav>
    </header>
  )
}
