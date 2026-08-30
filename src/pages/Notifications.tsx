import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ListControls } from '../components/ListControls'
import { byDate, optionsFrom, useListView } from '../listView'
import { EVENT_LABELS, formatDateTime, type EventType, type NotificationItem } from '../types'

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [error, setError] = useState('')

  const list = useListView<NotificationItem>('notifications', items, {
    search: (n) => `${n.title} ${n.body ?? ''}`,
    filters: [
      {
        key: 'event',
        label: 'event types',
        options: optionsFrom<NotificationItem>(
          (n) => n.eventType,
          (value) => EVENT_LABELS[value as EventType] ?? value,
        ),
        match: (n, value) => n.eventType === value,
      },
      {
        key: 'read',
        label: 'states',
        options: () => [
          { value: 'UNREAD', label: 'Unread' },
          { value: 'READ', label: 'Read' },
        ],
        match: (n, value) => (value === 'UNREAD' ? !n.read : n.read),
      },
    ],
    sorts: [
      { key: 'date', label: 'Date', compare: byDate<NotificationItem>((n) => n.createdAt), defaultDir: 'desc' },
    ],
    defaultSortKey: 'date',
    defaultSortDir: 'desc',
  })

  function load() {
    return api<NotificationItem[]>('/notifications', 'GET')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load notifications.'))
  }

  useEffect(() => { load() }, [])

  async function open(item: NotificationItem) {
    if (!item.read) {
      try {
        await api(`/notifications/${item.id}/read`, 'POST')
        setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? prev)
      } catch { /* navigating matters more */ }
    }
    if (item.link) navigate(item.link)
  }

  async function markAll() {
    try {
      await api('/notifications/read-all', 'POST')
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev)
    } catch { /* ignore */ }
  }

  const unread = items?.filter((n) => !n.read).length ?? 0

  return (
    <>
      <div className="page-head">
        <h2>Notifications</h2>
        {unread > 0 && <button className="btn btn-ghost-dark" onClick={markAll}>Mark all read</button>}
      </div>

      {error && <div className="msg err">{error}</div>}
      {items === null && !error && <div className="loading">Loading…</div>}

      {items !== null && items.length === 0 && (
        <div className="empty"><p>Nothing yet. Updates on your jobs and quotes will appear here.</p></div>
      )}

      {items && items.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search notifications" countLabel="notifications" />
      )}

      {items && items.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No notifications match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
        <div className="notif-list">
          {list.visible.map((item) => (
            <button key={item.id} className={`notif-row${item.read ? '' : ' unread'}`} onClick={() => open(item)}>
              <span className="notif-main">
                <span className="notif-title">{item.title}</span>
                {item.body && <span className="notif-body">{item.body}</span>}
              </span>
              <span className="notif-side">
                <span className="chip">{EVENT_LABELS[item.eventType] ?? item.eventType}</span>
                <span className="notif-date">{formatDateTime(item.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
