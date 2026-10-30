import { Link } from 'react-router-dom'

/* Top navigation for the public landing pages (design V3).
   `active` says which page we're on: that half of the pill switch is
   highlighted and scrolls within the page; the other half links across. */
export function LandingNav({ active }: { active: 'customers' | 'providers' }) {
  const onCustomers = active === 'customers'
  return (
    <header className="lp-nav">
      <nav aria-label="Main" className="lp-nav-in">
        <Link to="/" className="lp-logo">
          <span className="lp-logo-j" aria-hidden="true">J</span>
          <span className="lp-logo-name">JOBBY-CONNECT</span>
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
          <Link to="/login" className="lp-nav-login">Log in</Link>
          <Link to="/register" className="lp-btn-nav">Create a free account</Link>
        </div>
      </nav>
    </header>
  )
}
