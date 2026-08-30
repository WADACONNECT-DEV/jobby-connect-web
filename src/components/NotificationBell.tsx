import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatDateTime, type NotificationItem } from '../types'

/** How often the badge re-checks. Cheap query, and no websocket in the stack. */
const POLL_MS = 60_000

export function NotificationBell() {
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const wrap = useRef<HTMLDivElement | null>(null)

  function loadCount() {
    api<{ count: number }>('/notifications/unread-count', 'GET')
      .then((r) => setCount(r.count))
      .catch(() => { /* a failed badge shouldn't surface an error */ })
  }

  useEffect(() => {
    loadCount()
    const timer = window.setInterval(loadCount, POLL_MS)
    return () => window.clearInterval(timer)
  }, [])

  // Close when clicking outside the panel.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      api<NotificationItem[]>('/notifications', 'GET')
        .then((all) => setItems(all.slice(0, 8)))
        .catch(() => setItems([]))
    }
  }

  async function openItem(item: NotificationItem) {
    setOpen(false)
    if (!item.read) {
      try {
        await api(`/notifications/${item.id}/read`, 'POST')
        setCount((c) => Math.max(0, c - 1))
      } catch { /* navigating still matters more */ }
    }
    if (item.link) navigate(item.link)
  }

  async function markAll() {
    try {
      await api('/notifications/read-all', 'POST')
      setCount(0)
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev)
    } catch { /* ignore */ }
  }

  return (
    <div className="nb-wrap" ref={wrap}>
      <button
        className="nb-btn"
        onClick={toggle}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        title="Notifications"
      >
        <span aria-hidden="true">🔔</span>
        {count > 0 && <span className="nb-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="nb-panel">
          <div className="nb-head">
            <span>Notifications</span>
            {count > 0 && <button className="nb-link" onClick={markAll}>Mark all read</button>}
          </div>

          {items === null && <div className="nb-empty">Loading…</div>}
          {items?.length === 0 && <div className="nb-empty">Nothing yet.</div>}

          {items?.map((item) => (
            <button
              key={item.id}
              className={`nb-item${item.read ? '' : ' unread'}`}
              onClick={() => openItem(item)}
            >
              <span className="nb-item-title">{item.title}</span>
              {item.body && <span className="nb-item-body">{item.body}</span>}
              <span className="nb-item-date">{formatDateTime(item.createdAt)}</span>
            </button>
          ))}

          <button className="nb-all" onClick={() => { setOpen(false); navigate('/notifications') }}>
            See all notifications
          </button>
        </div>
      )}
    </div>
  )
}
