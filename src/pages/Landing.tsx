import { useNavigate } from 'react-router-dom'

const CATEGORIES = [
  { icon: '🔧', title: 'Trades', desc: 'Plumbing, electrical, handyman' },
  { icon: '🧹', title: 'Cleaning', desc: 'Home, office, end-of-lease' },
  { icon: '💆', title: 'Personal', desc: 'Beauty, fitness, wellbeing' },
  { icon: '💼', title: 'Professional', desc: 'Tax, design, tutoring' },
  { icon: '🎉', title: 'Events', desc: 'Catering, photography, music' },
  { icon: '🚚', title: 'Removals', desc: 'Moving, delivery, rubbish' },
]

export default function Landing() {
  const navigate = useNavigate()
  return (
    <>
      <section className="hero">
        <h1>
          Every job, <span className="amber">one app.</span>
          <br />
          Find a local pro — or become one.
        </h1>
        <p>
          Jobby-Connect links Australians who need a job done with trusted local providers across
          trades, cleaning, personal care, professional services and events.
        </p>
        <div className="hero-actions">
          <button className="btn btn-amber" onClick={() => navigate('/register')}>
            Get started
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>
            I already have an account
          </button>
        </div>
      </section>

      <div className="section-title">What you can find help with</div>
      <div className="cats">
        {CATEGORIES.map((c) => (
          <div className="cat" key={c.title}>
            <div className="cat-ico">{c.icon}</div>
            <div className="cat-t">{c.title}</div>
            <div className="cat-d">{c.desc}</div>
          </div>
        ))}
      </div>
    </>
  )
}
