import { AuthShell } from '../components/landing/AuthLayout'

/**
 * Terms of Use — redesign step 2. The wording is supplied by Jobby-Connect;
 * until then this page shows a clear placeholder and no invented legal text.
 */
export default function Terms() {
  return (
    <AuthShell>
      <article className="lp-auth-card is-single lp-legal">
        <span className="lp-auth-eyebrow">Jobby-Connect</span>
        <h1 className="lp-auth-title">Terms of Use</h1>
        <p className="lp-legal-placeholder">[Terms of Use — to be supplied by Jobby-Connect]</p>
      </article>
    </AuthShell>
  )
}
