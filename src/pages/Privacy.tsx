import { AuthShell } from '../components/landing/AuthLayout'

/**
 * Privacy Policy — redesign step 2. The wording is supplied by Jobby-Connect;
 * until then this page shows a clear placeholder and no invented legal text.
 */
export default function Privacy() {
  return (
    <AuthShell>
      <article className="lp-auth-card is-single lp-legal">
        <span className="lp-auth-eyebrow">Jobby-Connect</span>
        <h1 className="lp-auth-title">Privacy Policy</h1>
        <p className="lp-legal-placeholder">[Privacy Policy — to be supplied by Jobby-Connect]</p>
      </article>
    </AuthShell>
  )
}
