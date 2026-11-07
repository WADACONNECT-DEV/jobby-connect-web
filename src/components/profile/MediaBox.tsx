import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api, apiObjectUrl, apiUpload } from '../../api'
import type { ProfileMedia, ProfileMediaKind } from '../../types'

/**
 * One photo slot on the Premium profile editor (step P4): logo, hero, a
 * service listing's photo, or one gallery tile. Uploads go straight to
 * POST /provider/profile/media when a file is chosen, as job photos do; they
 * don't wait for the form's Save.
 *
 * Thumbnails come through the authenticated endpoint, so each is fetched as a
 * blob and shown as an object URL, revoked on unmount.
 */
interface Props {
  kind: ProfileMediaKind
  /** The current photo in this slot, or null. */
  item: ProfileMedia | null
  /** For SERVICE photos: the listing the photo belongs to. Null until the listing is saved. */
  serviceRef?: string | null
  /** Shape of the box. */
  shape?: 'square' | 'wide' | 'tile'
  label?: string
  /** Shown instead of the picker when the slot can't take a photo yet. */
  disabledNote?: string
  onChange: () => void
  children?: ReactNode
}

export function MediaBox({ kind, item, serviceRef, shape = 'square', label, disabledNote, onChange, children }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let made: string | null = null
    setUrl(null)
    if (item) {
      apiObjectUrl(`/profile-media/${item.id}?thumb=${shape === 'wide' ? 'false' : 'true'}`)
        .then((u) => {
          if (cancelled) { URL.revokeObjectURL(u); return }
          made = u
          setUrl(u)
        })
        .catch(() => { /* a broken thumbnail shouldn't break the editor */ })
    }
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made) }
  }, [item?.id, shape])

  async function upload(file: File) {
    setError(''); setBusy(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const query = serviceRef ? `&serviceRef=${serviceRef}` : ''
      await apiUpload<ProfileMedia>(`/provider/profile/media?kind=${kind}${query}`, form)
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    if (!item) return
    setError(''); setBusy(true)
    try {
      await api(`/profile-media/${item.id}`, 'DELETE')
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the photo.')
    } finally {
      setBusy(false)
    }
  }

  const disabled = Boolean(disabledNote)

  return (
    <div className={`mb is-${shape}${item ? ' has-photo' : ''}`}>
      {label && <span className="mb-label">{label}</span>}
      <div className="mb-frame">
        {url && <img src={url} alt={item?.originalFilename ?? label ?? 'Photo'} />}
        {!url && item && <span className="mb-loading">…</span>}
        {!item && !disabled && (
          <button type="button" className="mb-pick" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading…' : '+ Add photo'}
          </button>
        )}
        {!item && disabled && <span className="mb-note">{disabledNote}</span>}
        {children}
      </div>
      {item && !disabled && (
        <div className="mb-actions">
          <button type="button" className="pr-link" disabled={busy} onClick={() => input.current?.click()}>Replace</button>
          <button type="button" className="pr-link" disabled={busy} onClick={remove}>Remove</button>
        </div>
      )}
      {error && <span className="mb-error">{error}</span>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
    </div>
  )
}
