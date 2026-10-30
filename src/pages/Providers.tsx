import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LandingNav } from '../components/LandingNav'
import { HeroSlideshow } from '../components/HeroSlideshow'
import type { Slide } from '../components/HeroSlideshow'
import { ArrowIcon, PhotoSlide } from '../components/LandingSteps'
import type { Photo } from '../components/LandingSteps'
import { PaidStep, ProviderOverviewSlide, QuoteStep, RunStep, SetupStep } from '../components/ProviderSteps'

/* Providers landing page — design V3 (design/providers-v3, 30 Oct 2026).
   Same building blocks as the Customers page; the provider colours come
   from `.lp--providers` in index.css. */

const PHOTOS: Photo[] = [
  { src: '/landing/provider-quoting.jpg', pos: '30% 30%', tag: 'Quoting on site', alt: 'A tradeswoman checks a job on her tablet while her colleague fits kitchen cabinets' },
  { src: '/landing/provider-electrical.jpg', pos: '40% 30%', tag: 'Electrical', alt: 'An electrician prepares a quote on his laptop in his workshop' },
  { src: '/landing/provider-garden.jpg', pos: '45% 30%', tag: 'Garden care', alt: 'A gardener reviews job photos on her phone at her desk' },
  { src: '/landing/provider-cleaning.jpg', pos: '40% 30%', tag: 'Cleaning', alt: 'A cleaning business owner replies to a request on his phone' },
]

const SLIDES: Slide[] = [
  { label: 'Overview', weight: 1.6, content: <ProviderOverviewSlide /> },
  { label: 'Step 1 · Set up', weight: 1.2, content: <div className="lp-step lp-step--slide"><SetupStep size="slide" /></div> },
  { label: 'Step 2 · Quote', weight: 1.2, content: <div className="lp-step lp-step--slide"><QuoteStep size="slide" /></div> },
  { label: 'Step 3 · Do the job', weight: 1.2, content: <div className="lp-step lp-step--slide"><RunStep size="slide" /></div> },
  { label: 'Step 4 · Get paid', weight: 1.2, content: <div className="lp-step lp-step--slide"><PaidStep size="slide" /></div> },
  ...PHOTOS.map((p) => ({ label: p.tag, weight: 0.7, content: <PhotoSlide {...p} /> })),
]

const JOIN_STEPS = [
  { title: 'Create your free account', desc: 'Everyone starts with a Jobby-Connect account.' },
  { title: 'Add your business', desc: 'ABN, bank details, industries and the suburbs you cover.' },
  { title: 'Get approved, start quoting', desc: 'Once approved, you appear in customer search.' },
]

const BadgeIcon = ({ children }: { children: ReactNode }) => (
  <span className="lp-badge-ico">
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F7C21B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
)

export default function Providers() {
  return (
    <div className="lp lp--providers">
      <LandingNav active="providers" />

      {/* ---- Hero ---- */}
      <section className="lp-hero">
        <div className="lp-hero-in">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <span>FOR LOCAL SERVICE PROVIDERS</span>
              <span className="lp-rule" aria-hidden="true" />
            </div>
            <h1 className="lp-h1">
              Win local work.
              <br />
              Run every job.
              <br />
              <span className="lp-h1-accent">Get paid.</span>
            </h1>
            <p className="lp-lead">
              Private quote requests from customers who chose you. No lead fees, and payouts go straight to your bank.
            </p>
            <div className="lp-actions">
              <Link to="/register" className="lp-btn lp-btn-start">
                Start as a provider <ArrowIcon />
              </Link>
              <a href="#get" className="lp-btn lp-btn-ghost">See what you get</a>
            </div>
            <div className="lp-badges">
              <span className="lp-badge">
                <BadgeIcon>
                  <path d="M4 4l16 16" />
                  <circle cx="12" cy="12" r="9" />
                </BadgeIcon>
                No lead fees
              </span>
              <span className="lp-badge">
                <BadgeIcon>
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </BadgeIcon>
                Private requests only
              </span>
              <span className="lp-badge">
                <BadgeIcon>
                  <path d="M2 6h20v12H2z" />
                  <circle cx="12" cy="12" r="2.5" />
                </BadgeIcon>
                Paid to your bank
              </span>
            </div>
          </div>

          <HeroSlideshow id="how" title="YOUR BUSINESS, MADE SIMPLE" ariaLabel="Your business, made simple" slides={SLIDES} />
        </div>
      </section>

      {/* ---- How to join ---- */}
      <section id="join" className="lp-join">
        <div className="lp-join-in">
          <div className="lp-join-head">
            <span className="lp-kicker lp-kicker--gold">HOW TO JOIN</span>
            <h2 className="lp-join-h">Three steps to your first request</h2>
          </div>
          <ol className="lp-join-list">
            {JOIN_STEPS.map((s, k) => (
              <li key={s.title} className="lp-join-step">
                <span className="lp-join-n">{k + 1}</span>
                <span className="lp-point-txt">
                  <strong>{s.title}</strong>
                  <br />
                  <span className="lp-point-d">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Everything you get ---- */}
      <section id="get" className="lp-get">
        <div className="lp-sec-head">
          <span className="lp-kicker">FOR PROVIDERS</span>
          <h2 className="lp-h2">Grow your business, on fair terms</h2>
          <p className="lp-sec-sub">No lead fees. Private requests. Paid when the job is done.</p>
        </div>

        <div className="lp-cards">
          <article className="lp-step lp-step--card"><SetupStep size="card" /></article>
          <article className="lp-step lp-step--card"><QuoteStep size="card" /></article>
          <article className="lp-step lp-step--card"><RunStep size="card" /></article>
          <article className="lp-step lp-step--card"><PaidStep size="card" /></article>
        </div>

        <div className="lp-extras">
          <div className="lp-extra">
            <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" fill="none" stroke="#0F2A4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="10" width="26" height="30" rx="4" />
              <path d="M12 18h14M12 24h14M12 30h8" />
              <circle cx="36" cy="34" r="8" fill="#F7C21B" stroke="#F7C21B" />
              <path d="M36 30v8M32 34h8" stroke="#0F2A4A" />
            </svg>
            <span className="lp-extra-txt">
              <strong>Bring your own customers</strong>
              <br />
              <span className="lp-extra-d">Invite the customers you already have, with an optional Mate Points welcome offer.</span>
            </span>
          </div>
          <div className="lp-extra">
            <svg aria-hidden="true" width="52" height="52" viewBox="0 0 48 48" fill="none" stroke="#0F2A4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="17" cy="16" r="7" />
              <path d="M4 42c0-8 6-13 13-13s13 5 13 13" />
              <path d="M32 22l4 4 8-8" stroke="#D9A400" strokeWidth="3" />
            </svg>
            <span className="lp-extra-txt">
              <strong>One login, both roles</strong>
              <br />
              <span className="lp-extra-d">Your customer and provider areas sit side by side, each in its own colours.</span>
            </span>
          </div>
        </div>
      </section>

      {/* ---- Closing call to action ---- */}
      <section className="lp-cta">
        <div className="lp-cta-in">
          <h2 className="lp-cta-h">Your next customer is looking for you.</h2>
          <div className="lp-cta-actions">
            <Link to="/register" className="lp-btn lp-btn-deep">
              Start as a provider <ArrowIcon />
            </Link>
            <Link to="/" className="lp-btn lp-btn-outline-deep">I'm a customer</Link>
          </div>
          <span className="lp-cta-note">Free to join. No lead fees.</span>
        </div>
      </section>
    </div>
  )
}
