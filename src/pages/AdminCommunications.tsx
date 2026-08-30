import { useEffect, useState } from 'react'
import { api } from '../api'
import { ListControls } from '../components/ListControls'
import { byDate, byText, optionsFrom, useListView } from '../listView'
import { EVENT_LABELS, formatDateTime, type EventType, type OutboxEntry } from '../types'

/**
 * Every message the platform has emitted, on every channel, with its delivery
 * outcome. This is the Round 1 evidence surface — a scenario can be walked
 * through here and screenshotted per tracker row, instead of reading logs.
 */
export default function AdminCommunications() {
  const [rows, setRows] = useState<OutboxEntry[] | null>(null)
  const [error, setError] = useState('')

  const list = useListView<OutboxEntry>('admin.communications', rows, {
    search: (r) => `${r.recipientName ?? ''} ${r.recipientAddress ?? ''} ${r.subject ?? ''} ${r.body ?? ''}`,
    filters: [
      {
        key: 'channel',
        label: 'channels',
        options: optionsFrom<OutboxEntry>((r) => r.channel),
        match: (r, v) => r.channel === v,
      },
      {
        key: 'status',
        label: 'outcomes',
        options: optionsFrom<OutboxEntry>((r) => r.status),
        match: (r, v) => r.status === v,
      },
      {
        key: 'event',
        label: 'event types',
        options: optionsFrom<OutboxEntry>(
          (r) => r.eventType,
          (v) => EVENT_LABELS[v as EventType] ?? v,
        ),
        match: (r, v) => r.eventType === v,
      },
    ],
    sorts: [
      { key: 'when', label: 'Time', compare: byDate<OutboxEntry>((r) => r.createdAt), defaultDir: 'desc' },
      { key: 'who', label: 'Recipient', compare: byText<OutboxEntry>((r) => r.recipientName), defaultDir: 'asc' },
    ],
    defaultSortKey: 'when',
    defaultSortDir: 'desc',
  })

  useEffect(() => {
    api<OutboxEntry[]>('/admin/communications', 'GET')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load communications.'))
  }, [])

  return (
    <>
      <div className="page-head"><h2>Communications</h2></div>
      <p className="page-intro">
        Delivery record for every notification, email and SMS the platform has sent — including
        the ones that failed.
      </p>

      {error && <div className="msg err">{error}</div>}
      {rows === null && !error && <div className="loading">Loading…</div>}

      {rows !== null && rows.length === 0 && (
        <div className="empty"><p>Nothing sent yet.</p></div>
      )}

      {rows && rows.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search recipient or content" countLabel="messages" />
      )}

      {rows && rows.length > 0 && (
        <div className="md-panel">
          <table className="md-table">
            <thead>
              <tr>
                <th>Time</th><th>Event</th><th>Channel</th><th>Recipient</th>
                <th>Subject / body</th><th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {list.visible.map((r) => (
                <tr key={r.id}>
                  <td className="ob-when">{formatDateTime(r.createdAt)}</td>
                  <td>{EVENT_LABELS[r.eventType] ?? r.eventType}</td>
                  <td><span className="chip">{r.channel}</span></td>
                  <td>
                    {r.recipientName ?? '—'}
                    {r.recipientAddress && <div className="ob-addr">{r.recipientAddress}</div>}
                  </td>
                  <td className="ob-body">
                    {r.subject && <strong>{r.subject}</strong>}
                    {r.body && <div>{r.body}</div>}
                  </td>
                  <td>
                    <span className={`ob-status ob-${r.status.toLowerCase()}`}>{r.status}</span>
                    {r.error && <div className="ob-err">{r.error}</div>}
                    {r.providerRef && <div className="ob-addr">{r.providerRef}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.shown === 0 && <p className="md-note">No messages match these filters.</p>}
        </div>
      )}
    </>
  )
}
