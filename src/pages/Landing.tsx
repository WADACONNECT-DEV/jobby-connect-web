import { Link } from 'react-router-dom'
import {
  Eyebrow, Feature, LandingNav, NumberedHead, PhotoSlide, ScrollLink, Slideshow, StepFlow, StepSlide,
  type Slide,
} from '../components/landing/LandingParts'
import {
  ArrowRight, Calendar, Card, Doc, Gift, Heart, InviteTradie, Mates, Search, ShieldCheck, StarCoin,
  StarFilled, StepCompare, StepFind, StepPay, StepTrack, Tick, Wallet, Wrench,
} from '../components/landing/landingIcons'
import { usePublicMaxProvidersPerRequest } from '../platform'

/**
 * Landing page — Customers (`/`). Owner's Version 3 design, 30 Oct 2026
 * (design/customers-v3/Customers.dc.html). Light-blue theme.
 *
 * Rendered without the app's site header and footer — it has its own.
 * Logged-in users never see it: App.tsx sends them to /home.
 *
 * The provider count ("Up to n") is the admin setting, read from a public call
 * because visitors aren't logged in (owner decision 3 Nov 2026 §1).
 */

/* ---------- pictures of the product (not working controls) ---------- */

type PictureSize = 'slide' | 'card'

/**
 * A picture of the search box. Not a form: nothing can be typed or focused
 * inside it. The whole picture is one link to sign-up, because that is where
 * a visitor has to go to search for real.
 */
function SearchPicture({ size }: { size: PictureSize }) {
  return (
    <Link to="/register" className={`lp-pic lp-pic-${size} lp-pic-search`} aria-label="Create a free account to search for providers">
      <span className="lp-fake-field" aria-hidden="true">Suburb · e.g. Mulgrave</span>
      <span className="lp-fake-field" aria-hidden="true">Industry · e.g. Gardening</span>
      <span className="lp-fake-btn" aria-hidden="true">Search</span>
    </Link>
  )
}

function QuotesPicture({ size }: { size: PictureSize }) {
  return (
    <div className={`lp-pic lp-pic-${size} lp-pic-quotes`} aria-hidden="true">
      <span className="lp-quote"><strong>$</strong><span className="lp-line" /><span className="lp-line" /></span>
      <span className="lp-quote is-picked"><strong>$</strong><span className="lp-line" /><span className="lp-line" />
        <span className="lp-quote-choose">Choose</span></span>
      <span className="lp-quote"><strong>$</strong><span className="lp-line" /><span className="lp-line" /></span>
    </div>
  )
}

function TrackPicture({ size }: { size: PictureSize }) {
  return (
    <div className={`lp-pic lp-pic-${size} lp-pic-track`} aria-hidden="true">
      <span className="lp-track-head">
        <strong>Gardening job</strong>
        <span className="lp-mono">000000012-CAS001-PAS002-001</span>
      </span>
      <span className="lp-track-states">
        <span><span className="lp-state-dot is-green" />Accepted</span>
        <span className="is-current"><span className="lp-state-dot is-blue" />In progress</span>
        <span><span className="lp-state-dot is-empty" />Completed</span>
      </span>
      <span className="lp-track-bar"><span style={{ width: '55%' }} /></span>
    </div>
  )
}

function RewardPicture({ size }: { size: PictureSize }) {
  const slide = size === 'slide'
  return (
    <div className={`lp-pic lp-pic-${size} lp-pic-reward`} aria-hidden="true">
      <StarCoin size={slide ? 100 : 92} ring={slide ? 8 : 7} star={slide ? 48 : 44} />
      <span className={`lp-heart-badge ${slide ? 'is-slide' : 'is-card'}`}><Heart /></span>
    </div>
  )
}

/* ---------- page ---------- */

export default function Landing() {
  const maxProviders = usePublicMaxProvidersPerRequest()
  const upTo = `Up to ${maxProviders}`

  const slides: Slide[] = [
    {
      label: 'Overview',
      content: (
        <div className="lp-overview">
          <StepFlow steps={[
            { icon: <StepFind />, title: 'Find', sub: 'Choose local providers' },
            { icon: <StepCompare />, title: 'Compare', sub: `${upTo} private quotes` },
            { icon: <StepTrack />, title: 'Track', sub: 'Follow the work' },
            { icon: <StepPay />, title: 'Pay & rate', sub: 'Complete your job' },
          ]} />
          <div className="lp-overview-band">
            <StarCoin size={48} ring={4} star={22} />
            <span className="lp-band-text">
              <span className="lp-band-title">Earn Mate Points</span>
              <span className="lp-muted">Use them on a future service.</span>
            </span>
          </div>
        </div>
      ),
    },
    {
      label: 'Step 1 · Find',
      content: (
        <StepSlide n="01" title="Find your local help" picture={<SearchPicture size="slide" />}>
          <Feature icon={<Search />} title="Search your suburb">Sort by rating, jobs done or bonus points.</Feature>
          <Feature icon={<ShieldCheck size={18} />} title="Approved providers">Reviewed before appearing in search.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Step 2 · Compare',
      content: (
        <StepSlide n="02" title="Choose with confidence" picture={<QuotesPicture size="slide" />}>
          <Feature icon={<Doc />} title="Private quotes">Request quotes from up to {maxProviders} providers you choose.</Feature>
          <Feature icon={<Tick />} title="Compare & accept">Choose one quote. The others are closed automatically.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Step 3 · Track & pay',
      content: (
        <StepSlide n="03" title="Stay in control" picture={<TrackPicture size="slide" />}>
          <Feature icon={<Calendar />} title="Track every stage">One Quote ID keeps your job together.</Feature>
          <Feature icon={<Card />} title="Pay for completed work">Pay in-app, including agreed stages.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Step 4 · Rate & earn',
      content: (
        <StepSlide n="04" title="Keep the good going" picture={<RewardPicture size="slide" />}>
          <Feature icon={<StarFilled />} title="Rate & earn points">Rate your paid job to receive your Mate Points.</Feature>
          <Feature icon={<Gift />} title="Use your rewards">Redeem points on future services.</Feature>
        </StepSlide>
      ),
    },
    {
      label: 'Garden care',
      content: <PhotoSlide src="/landing/cust-garden.jpg" position="50% 30%" tag="Garden care"
        alt="An older woman checks a job on her phone with her gardener" />,
    },
    {
      label: 'Home cleaning',
      content: <PhotoSlide src="/landing/cust-cleaning.jpg" position="50% 30%" tag="Home cleaning"
        alt="A young woman uses the app while her cleaner waits with his kit" />,
    },
    {
      label: 'Home repairs',
      content: <PhotoSlide src="/landing/cust-repairs.jpg" position="45% 30%" tag="Home repairs"
        alt="An older man and a woman tradie look at the app on his front steps" />,
    },
    {
      label: 'Trades',
      content: <PhotoSlide src="/landing/cust-trades.jpg" position="50% 25%" tag="Trades"
        alt="A young man shows his phone to a woman tradie at his front door" />,
    },
  ]

  return (
    <div className="lp lp-customer">
      <LandingNav theme="customer" />

      {/* ---------- hero ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-in">
          <div className="lp-hero-copy">
            <Eyebrow>LOCAL SERVICES. ONE SIMPLE JOURNEY.</Eyebrow>
            <h1 className="lp-h1">Find the right help.<br />Get it done.<br />Be rewarded.</h1>
            <p className="lp-lead">Choose local providers, compare private quotes and manage your job in one place.</p>
            <div className="lp-actions">
              <Link to="/register" className="lp-btn lp-btn-lg lp-btn-primary">Create a free account <ArrowRight /></Link>
              <ScrollLink to="get" className="lp-btn lp-btn-lg lp-btn-outline">See how it works</ScrollLink>
            </div>
            <ul className="lp-trust">
              <li><span className="lp-trust-ico"><ShieldCheck /></span>Approved providers</li>
              <li><span className="lp-trust-ico"><Wallet /></span>Free customer account</li>
              <li><span className="lp-trust-ico"><StarFilled size={22} /></span>Mate Points on every job</li>
            </ul>
          </div>

          <Slideshow id="how" title="YOUR JOB, MADE SIMPLE" slides={slides} />
        </div>
      </section>

      {/* ---------- everything you get ---------- */}
      <section id="get" tabIndex={-1} className="lp-get">
        <div className="lp-section-head">
          <span className="lp-kicker">For customers</span>
          <h2 className="lp-h2">Everything you get with a free account</h2>
          <p className="lp-sub">From your first search to your next trusted Jobby Mate.</p>
        </div>

        <div className="lp-cards">
          <article className="lp-card">
            <NumberedHead n="01" title="Find your local help" />
            <SearchPicture size="card" />
            <div className="lp-feats">
              <Feature size="card" icon={<Search />} title="Search your suburb">Sort by rating, jobs done or bonus points.</Feature>
              <Feature size="card" icon={<ShieldCheck size={18} />} title="Approved providers">Reviewed before appearing in search.</Feature>
            </div>
          </article>

          <article className="lp-card">
            <NumberedHead n="02" title="Choose with confidence" />
            <QuotesPicture size="card" />
            <div className="lp-feats">
              <Feature size="card" icon={<Doc />} title="Private quotes">Request quotes from up to {maxProviders} providers you choose.</Feature>
              <Feature size="card" icon={<Tick />} title="Compare & accept">Choose one quote. The others are closed automatically.</Feature>
            </div>
          </article>

          <article className="lp-card">
            <NumberedHead n="03" title="Stay in control" />
            <TrackPicture size="card" />
            <div className="lp-feats">
              <Feature size="card" icon={<Calendar />} title="Track every stage">One Quote ID keeps your job together.</Feature>
              <Feature size="card" icon={<Card />} title="Pay for completed work">Pay in-app, including agreed stages.</Feature>
            </div>
          </article>

          <article className="lp-card">
            <NumberedHead n="04" title="Keep the good going" />
            <RewardPicture size="card" />
            <div className="lp-feats">
              <Feature size="card" icon={<StarFilled />} title="Rate & earn points">Rate your paid job to receive your Mate Points.</Feature>
              <Feature size="card" icon={<Gift />} title="Use your rewards">Redeem points on future services.</Feature>
            </div>
          </article>
        </div>

        <div className="lp-strip">
          <div className="lp-strip-item">
            <Mates />
            <span><strong className="lp-strip-title">Your Jobby Mates</strong><br />
              <span className="lp-muted">Save trusted providers and book them again.</span></span>
          </div>
          <div className="lp-strip-item">
            <InviteTradie />
            <span><strong className="lp-strip-title">Bring your own tradie</strong><br />
              <span className="lp-muted">Invite your existing provider and earn referral Mate Points when they join.</span></span>
          </div>
        </div>
      </section>

      {/* ---------- provider teaser ---------- */}
      <section className="lp-teaser-wrap">
        <div className="lp-teaser">
          <div className="lp-teaser-copy">
            <span className="lp-teaser-ico"><Wrench /></span>
            <span><strong className="lp-teaser-title">Run a local service business?</strong><br />
              <span className="lp-teaser-sub">Private requests, no lead fees, and payouts straight to your bank.</span></span>
          </div>
          <Link to="/for-providers" className="lp-btn lp-btn-lg lp-btn-yellow">See what providers get <ArrowRight /></Link>
        </div>
      </section>

      {/* ---------- closing call to action ---------- */}
      <section className="lp-cta">
        <div className="lp-cta-in">
          <h2 className="lp-cta-title">Your next job starts here.</h2>
          <div className="lp-cta-actions">
            <Link to="/register" className="lp-btn lp-btn-lg lp-btn-yellow lp-btn-wide">Create a free account <ArrowRight /></Link>
            <Link to="/for-providers" className="lp-btn lp-btn-lg lp-btn-ghost">I'm a provider</Link>
          </div>
          <span className="lp-cta-note">Free to join. Easy to get started.</span>
        </div>
      </section>
    </div>
  )
}
