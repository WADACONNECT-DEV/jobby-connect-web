import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * The avatar menu at the top right of every logged-in page (redesign step 3).
 *
 * Holds the same two things the header used to show as a name link and a
 * button: Account settings (/account) and Log out. The log-out action itself
 * is passed in, so it stays exactly what App.tsx always did.
 */
export function AccountMenu({ fullName, onLogout }: { fullName: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement | null>(null)
  const firstName = fullName.trim().split(/\s+/)[0] || fullName
  const initial = (firstName.charAt(0) || '?').toUpperCase()

  // Close on a click outside the menu or on Escape.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="app-acct" ref={wrap}>
      <button type="button" className="app-acct-btn" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <span className="app-avatar" aria-hidden="true">{initial}</span>
        <span className="app-acct-name">{firstName}</span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="app-acct-menu" role="menu">
          <div className="app-acct-who">{fullName}</div>
          <Link to="/account" role="menuitem" className="app-acct-item" onClick={() => setOpen(false)}>
            Account settings
          </Link>
          <button type="button" role="menuitem" className="app-acct-item"
            onClick={() => { setOpen(false); onLogout() }}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
