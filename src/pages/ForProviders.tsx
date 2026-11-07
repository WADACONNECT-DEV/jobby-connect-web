import { Link } from 'react-router-dom'
import {
  Eyebrow, Feature, LandingNav, NumberedHead, PhotoSlide, ScrollLink, Slideshow, StepFlow, StepSlide,
  type Slide,
} from '../components/landing/LandingParts'
import {
  ArrowRight, BothRoles, Cash, CashYellow, CheckCircle, DocLines, InviteCustomers, ListDot, Lock, LockYellow,
  NoFees, Pin, ProfileCard, StarFilled, StepCompare, StepGetPaid,
} from '../components/landing/landingIcons'

/**
 * Landing page — Providers (`/for-providers`). Owner's Version 3 design,
 * 30 Oct 2026 (design/providers-v3/Providers.dc.html). Navy and cream theme.
 *
 * Wording changes from the design, per owner decisions 3 Nov 2026:
 *  - the public profile has Home, About Us, Services and Contact Us pages
 *    (Careers dropped), so slide 1 and card 01 say so.
 *
 * Rendered without the app's site header and footer — it has its own.
 * Logged-in users never see it: App.tsx sends them to /home.
 */

/* ---------- pictures of the product (not working controls) ---------- */

function ProfilePicture() {
  return (
    <div className="lp-pic lp-pic-slide lp-pic-profile" aria-hidden="true">
      <span className="lp-prof-head">
        <span className="lp-prof-logo">YB</span>
        <span className="lp-prof-name">
          <strong>[Your business name]</strong>
          <span className="lp-prof-ok">✓ Approved</span>
        </span>
      </span>
      <span className="lp-chips">
        <span className="lp-chip is-on">Home</span>
        <span className="lp-chip">About Us</span>
        <span className="lp-chip">Services</span>
        <span className="lp-chip">Contact Us</span>
      </span>
      <span className="lp-line lp-line-90" />
      <span className="lp-line lp-line-70" />
    </div>
  )
}

function QuotePicture() {
  return (
    <div className="lp-pic lp-pic-slide lp-pic-quote" aria-hidden="true">
      <span className="lp-row lp-row-head"><span>Your quote</span><span className="lp-row-note">3 line items</span></span>
      <span className="lp-row lp-row-fill"><span>Stage 1 · Deposit</span><strong>30%</strong></span>
      <span className="lp-row lp-row-fill"><span>Stage 2 · Completion</span><strong>70%</strong></span>
      <span className="lp-fake-btn">Send quote</span>
    </div>
  )
}

function WorkPicture() {
  return (
    <div className="lp-pic lp-pic-slide lp-pic-work" aria-hidden="true">
      <span className="lp-row lp-row-fill"><span>Received quotes</span><span className="lp-count">3</span></span>
      <span className="lp-row lp-row-fill"><span>Replied</span><strong>5</strong></span>
      <span className="lp-row lp-row-win"><strong>Wins</strong><strong className="lp-green">2</strong></span>
      <span className="lp-row lp-row-fill"><span>Job done</span><strong>8</strong></span>
    </div>
  )
}

function PayoutPicture() {
  return (
    <div className="lp-pic lp-pic-slide lp-pic-payout" aria-hidden="true">
      <span className="lp-track-states">
        <span><span className="lp-state-dot is-green" />Customer paid</span>
        <span><span className="lp-state-dot is-green" />Your review</span>
        <span className="is-current"><span className="lp-state-dot is-yellow" />Payout released</span>
      </span>
      <span className="lp-review">
        {[0, 1, 2, 3, 4].map((k) => <StarFilled key={k} size={15} stroke="none" />)}
        <strong>Great Job Mate</strong>
      </span>
    </div>
  )
}

/* ---------- page ---------- */

export default function ForProviders() {
  const slides: Slide[] = [
    {
      label: 'Overview',
      content: (
        <div className="lp-overview">
          <StepFlow steps={[
            { icon: <ProfileCard size={34} />, title: 'Set up', sub: 'Profile & service area' },
            { icon: <StepCompare tick="#0F2A4A" />, title: 'Quote', sub: 'Private requests only' },
            { icon: <CheckCircle size={34} />, title: 'Do the job', sub: 'Mark it complete' },
            { icon: <StepGetPaid />, title: 'Get paid', sub: 'Straight to your bank' },
          ]} />
          <div className="lp-overview-band">
            <span className="lp-band-coin"><StarFilled size={22} fill="#0F2A4A" stroke="none" /></span>
            <span className="lp-band-text">
              <span className="lp-band-title">Build your reputation</span>
              <span className="lp-muted">Good ratings lift you up in customer search.</span>
            </span>
          </div>
        </div>
      ),
    },
    {
      label: 'Step 1 · Set up',
      content: (
        <StepSlide n="01" title="Set up your business" picture={<ProfilePicture />}>
          <Feature icon={<ProfileCard />} title="Your public profile">Home, About Us, Services and Contact Us pages to show your work.</Feature>
          <Feature icon={<Pin />} title="Choose where you work">Pick your industries, suburbs and services.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Step 2 · Quote',
      content: (
        <StepSlide n="02" title="Win the right work" picture={<QuotePicture />}>
          <Feature icon={<Lock />} title="Private requests, no lead fees">Only customers who chose you. Never a resold lead.</Feature>
          <Feature icon={<DocLines />} title="Quotes your way">Itemised or staged quotes, plus bonus points to stand out.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Step 3 · Do the job',
      content: (
        <StepSlide n="03" title="Run every job" picture={<WorkPicture />}>
          <Feature icon={<ListDot />} title="Everything in one place">Requests, replies, wins and finished jobs, sorted for you.</Feature>
          <Feature icon={<CheckCircle />} title="Mark it done">Complete the whole job, or stage by stage.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Step 4 · Get paid',
      content: (
        <StepSlide n="04" title="Get paid, build your name" picture={<PayoutPicture />}>
          <Feature icon={<Cash />} title="Automatic payouts">Paid to your bank once you submit your job review.</Feature>
          <Feature icon={<StarFilled />} title="Ratings that work for you">Good reviews lift you up in customer search.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Quoting on site',
      content: <PhotoSlide src="/landing/prov-quoting.jpg" position="30% 30%" tag="Quoting on site"
        alt="A tradeswoman checks a job on her tablet while her colleague fits kitchen cabinets" />,
    },
    {
      label: 'Electrical',
      content: <PhotoSlide src="/landing/prov-electrical.jpg" position="40% 30%" tag="Electrical"
        alt="An electrician prepares a quote on his laptop in his workshop" />,
    },
    {
      label: 'Garden care',
      content: <PhotoSlide src="/landing/prov-garden.jpg" position="45% 30%" tag="Garden care"
        alt="A gardener reviews job photos on her phone at her desk" />,
    },
    {
      label: 'Cleaning',
      content: <PhotoSlide src="/landing/prov-cleaning.jpg" position="40% 30%" tag="Cleaning"
        alt="A cleaning business owner replies to a request on his phone" />,
    },
  ]

  return (
    <div className="lp lp-provider">
      <LandingNav theme="provider" />

      {/* ---------- hero ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-in">
          <div className="lp-hero-copy">
            <Eyebrow>FOR LOCAL SERVICE PROVIDERS</Eyebrow>
            <h1 className="lp-h1">Win local work.<br />Run every job.<br /><span className="lp-yellow">Get paid.</span></h1>
            <p className="lp-lead">Private quote requests from customers who chose you. No lead fees, and payouts go straight to your bank.</p>
            <div className="lp-actions">
              <Link to="/register" className="lp-btn lp-btn-lg lp-btn-yellow">Start as a provider <ArrowRight /></Link>
              <ScrollLink to="get" className="lp-btn lp-btn-lg lp-btn-ghost">See what you get</ScrollLink>
            </div>
            <ul className="lp-trust">
              <li><span className="lp-trust-ico"><NoFees /></span>No lead fees</li>
              <li><span className="lp-trust-ico"><LockYellow /></span>Private requests only</li>
              <li><span className="lp-trust-ico"><CashYellow /></span>Paid to your bank</li>
            </ul>
          </div>

          <Slideshow id="how" title="YOUR BUSINESS, MADE SIMPLE" slides={slides} />
        </div>
      </section>

      {/* ---------- how to join ---------- */}
      <section id="join" className="lp-join">
        <div className="lp-join-in">
          <div className="lp-join-head">
            <span className="lp-kicker">HOW TO JOIN</span>
            <h2 className="lp-h2-sm">Three steps to your first request</h2>
          </div>
          <ol className="lp-join-steps">
            <li><span className="lp-join-n" aria-hidden="true">1</span>
              <span><strong>Create your free account</strong><br />
                <span className="lp-muted">Everyone starts with a Jobby-Connect account.</span></span></li>
            <li><span className="lp-join-n" aria-hidden="true">2</span>
              <span><strong>Add your business</strong><br />
                <span className="lp-muted">ABN, bank details, industries and the suburbs you cover.</span></span></li>
            <li><span className="lp-join-n" aria-hidden="true">3</span>
              <span><strong>Get approved, start quoting</strong><br />
                <span className="lp-muted">Once approved, you appear in customer search.</span></span></li>
          </ol>
        </div>
      </section>

      {/* ---------- everything you get ---------- */}
      <section id="get" tabIndex={-1} className="lp-get">
        <div className="lp-section-head">
          <span className="lp-kicker">FOR PROVIDERS</span>
          <h2 className="lp-h2">Grow your business, on fair terms</h2>
          <p className="lp-sub">No lead fees. Private requests. Paid when the job is done.</p>
        </div>

        <div className="lp-cards">
          <article className="lp-card">
            <NumberedHead n="01" title="Set up your business" />
            <div className="lp-feats">
              <Feature size="card" icon={<ProfileCard />} title="Your public profile">Home, About Us, Services and Contact Us pages to show your work.</Feature>
              <Feature size="card" icon={<Pin />} title="Choose where you work">Pick your industries, suburbs and services. Kept private.</Feature>
            </div>
          </article>

          <article className="lp-card">
            <NumberedHead n="02" title="Win the right work" />
            <div className="lp-feats">
              <Feature size="card" icon={<Lock />} title="Private requests, no lead fees">Only customers who chose you. Never a resold lead.</Feature>
              <Feature size="card" icon={<DocLines />} title="Quotes your way">Itemised or staged quotes, plus bonus points to stand out.</Feature>
            </div>
          </article>

          <article className="lp-card">
            <NumberedHead n="03" title="Run every job" />
            <div className="lp-feats">
              <Feature size="card" icon={<ListDot />} title="Everything in one place">Requests, replies, wins and finished jobs, sorted for you.</Feature>
              <Feature size="card" icon={<CheckCircle />} title="Mark it done">Complete the whole job, or stage by stage.</Feature>
            </div>
          </article>

          <article className="lp-card">
            <NumberedHead n="04" title="Get paid, build your name" />
            <div className="lp-feats">
              <Feature size="card" icon={<Cash />} title="Automatic payouts">Paid to your bank once you submit your job review.</Feature>
              <Feature size="card" icon={<StarFilled />} title="Ratings that work for you">Good reviews lift you up in customer search.</Feature>
            </div>
          </article>
        </div>

        <div className="lp-strip">
          <div className="lp-strip-item">
            <InviteCustomers />
            <span><strong className="lp-strip-title">Bring your own customers</strong><br />
              <span className="lp-muted">Invite the customers you already have, with an optional Mate Points welcome offer.</span></span>
          </div>
          <div className="lp-strip-item">
            <BothRoles />
            <span><strong className="lp-strip-title">One login, both roles</strong><br />
              <span className="lp-muted">Your customer and provider areas sit side by side, each in its own colours.</span></span>
          </div>
        </div>
      </section>

      {/* ---------- closing call to action ---------- */}
      <section className="lp-cta">
        <div className="lp-cta-in">
          <h2 className="lp-cta-title">Your next customer is looking for you.</h2>
          <div className="lp-cta-actions">
            <Link to="/register" className="lp-btn lp-btn-lg lp-btn-navy lp-btn-wide">Start as a provider <ArrowRight /></Link>
            <Link to="/" className="lp-btn lp-btn-lg lp-btn-ghost">I'm a customer</Link>
          </div>
          <span className="lp-cta-note">Free to join. No lead fees.</span>
        </div>
      </section>
    </div>
  )
}
