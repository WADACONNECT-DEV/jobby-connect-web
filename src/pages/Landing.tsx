import { Link } from 'react-router-dom'
import { LandingNav } from '../components/LandingNav'
import { HeroSlideshow } from '../components/HeroSlideshow'
import type { Slide } from '../components/HeroSlideshow'
import {
  ArrowIcon,
  CompareStep,
  FindStep,
  OverviewSlide,
  PhotoSlide,
  RewardsStep,
  ShieldIcon,
  StarIcon,
  TrackStep,
  WalletIcon,
} from '../components/LandingSteps'
import type { Photo } from '../components/LandingSteps'

/* Customers landing page — design V3 (design/customers-v3, 30 Oct 2026). */

const PHOTOS: Photo[] = [
  { src: '/landing/garden-care.jpg', pos: '50% 30%', tag: 'Garden care', alt: 'An older woman checks a job on her phone with her gardener' },
  { src: '/landing/home-cleaning.jpg', pos: '50% 30%', tag: 'Home cleaning', alt: 'A young woman uses the app while her cleaner waits with his kit' },
  { src: '/landing/home-repairs.jpg', pos: '45% 30%', tag: 'Home repairs', alt: 'An older man and a woman tradie look at the app on his front steps' },
  { src: '/landing/trades.jpg', pos: '50% 25%', tag: 'Trades', alt: 'A young man shows his phone to a woman tradie at his front door' },
]

const SLIDES: Slide[] = [
  { label: 'Overview', weight: 1.6, content: <OverviewSlide /> },
  { label: 'Step 1 · Find', weight: 1.2, content: <div className="lp-step lp-step--slide"><FindStep size="slide" /></div> },
  { label: 'Step 2 · Compare', weight: 1.2, content: <div className="lp-step lp-step--slide"><CompareStep size="slide" /></div> },
  { label: 'Step 3 · Track & pay', weight: 1.2, content: <div className="lp-step lp-step--slide"><TrackStep size="slide" /></div> },
  { label: 'Step 4 · Rate & earn', weight: 1.2, content: <div className="lp-step lp-step--slide"><RewardsStep size="slide" /></div> },
  ...PHOTOS.map((p) => ({ label: p.tag, weight: 0.7, content: <PhotoSlide {...p} /> })),
]

export default function Landing() {
  return (
    <div className="lp">
      <LandingNav active="customers" />

      {/* ---- Hero ---- */}
      <section className="lp-hero">
        <div className="lp-hero-in">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <span>LOCAL SERVICES. ONE SIMPLE JOURNEY.</span>
              <span className="lp-rule" aria-hidden="true" />
            </div>
            <h1 className="lp-h1">
              Find the right help.
              <br />
              Get it done.
              <br />
              Be rewarded.
            </h1>
            <p className="lp-lead">Choose local providers, compare private quotes and manage your job in one place.</p>
            <div className="lp-actions">
              <Link to="/register" className="lp-btn lp-btn-navy">
                Create a free account <ArrowIcon />
              </Link>
              <a href="#get" className="lp-btn lp-btn-outline">See how it works</a>
            </div>
            <div className="lp-badges">
              <span className="lp-badge">
                <span className="lp-badge-ico"><ShieldIcon size={22} /></span>
                Approved providers
              </span>
              <span className="lp-badge">
                <span className="lp-badge-ico"><WalletIcon size={22} /></span>
                Free customer account
              </span>
              <span className="lp-badge">
                <span className="lp-badge-ico"><StarIcon size={22} /></span>
                Mate Points on every job
              </span>
            </div>
          </div>

          <HeroSlideshow id="how" title="YOUR JOB, MADE SIMPLE" ariaLabel="Your job, made simple" slides={SLIDES} />
        </div>
      </section>

      {/* ---- Everything you get ---- */}
      <section id="get" className="lp-get">
        <div className="lp-sec-head">
          <span className="lp-kicker">FOR CUSTOMERS</span>
          <h2 className="lp-h2">Everything you get with a free account</h2>
          <p className="lp-sec-sub">From your first search to your next trusted Jobby Mate.</p>
        </div>

        <div className="lp-cards">
          {/* The search boxes on this card are a picture; the whole card
              leads to sign-up instead. */}
          <Link to="/register" className="lp-step lp-step--card lp-step-link" aria-label="Find your local help — create a free account to search">
            <FindStep size="card" />
          </Link>
          <article className="lp-step lp-step--card"><CompareStep size="card" /></article>
          <article className="lp-step lp-step--card"><TrackStep size="card" /></article>
          <article className="lp-step lp-step--card"><RewardsStep size="card" /></article>
        </div>

        <div className="lp-extras">
          <div className="lp-extra">
            <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" fill="none" stroke="#0F2A4A" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="12" cy="24" r="5" />
              <circle cx="24" cy="24" r="5" />
              <circle cx="36" cy="24" r="5" />
              <path d="M4 42c0-5 4-8 8-8s8 3 8 8M16 42c0-5 4-8 8-8s8 3 8 8M28 42c0-5 4-8 8-8s8 3 8 8" />
              <path d="M24 14l-4-4a2.5 2.5 0 0 1 4-3 2.5 2.5 0 0 1 4 3z" fill="#F7C21B" stroke="#F7C21B" />
            </svg>
            <span className="lp-extra-txt">
              <strong>Your Jobby Mates</strong>
              <br />
              <span className="lp-extra-d">Save trusted providers and book them again.</span>
            </span>
          </div>
          <div className="lp-extra">
            <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" fill="none" stroke="#0F2A4A" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="20" cy="15" r="7" />
              <path d="M6 42c0-8 6-13 14-13 3 0 5 .5 7 1.5" />
              <circle cx="35" cy="36" r="8" fill="#F7C21B" stroke="#F7C21B" />
              <path d="M35 32v8M31 36h8" stroke="#0F2A4A" />
            </svg>
            <span className="lp-extra-txt">
              <strong>Bring your own tradie</strong>
              <br />
              <span className="lp-extra-d">Invite your existing provider and earn referral Mate Points when they join.</span>
            </span>
          </div>
        </div>
      </section>

      {/* ---- Provider teaser ---- */}
      <section id="providers" className="lp-teaser-wrap">
        <div className="lp-teaser">
          <div className="lp-teaser-copy">
            <span className="lp-teaser-ico">
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F2A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8z" />
              </svg>
            </span>
            <span className="lp-teaser-txt">
              <strong>Run a local service business?</strong>
              <br />
              <span className="lp-teaser-d">Private requests, no lead fees, and payouts straight to your bank.</span>
            </span>
          </div>
          <Link to="/for-providers" className="lp-btn lp-btn-teaser">
            See what providers get <ArrowIcon />
          </Link>
        </div>
      </section>

      {/* ---- Closing call to action ---- */}
      <section className="lp-cta">
        <div className="lp-cta-in">
          <h2 className="lp-cta-h">Your next job starts here.</h2>
          <div className="lp-cta-actions">
            <Link to="/register" className="lp-btn lp-btn-yellow">
              Create a free account <ArrowIcon />
            </Link>
            <Link to="/for-providers" className="lp-btn lp-btn-ghost">I'm a provider</Link>
          </div>
          <span className="lp-cta-note">Free to join. Easy to get started.</span>
        </div>
      </section>
    </div>
  )
}
