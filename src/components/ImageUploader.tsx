import { useEffect, useRef, useState } from 'react'
import { api, apiObjectUrl, apiUpload } from '../api'
import type { Attachment, AttachmentKind, ImageLimits } from '../types'

interface Props {
  jobId: string
  kind: AttachmentKind
  /** Required for PROGRESS photos — the progress entry they belong to. */
  progressId?: string
  /** False renders a read-only gallery (the other party's view). */
  canUpload?: boolean
  label?: string
  /** Called after a successful upload or delete, e.g. to refresh a count. */
  onChange?: () => void
}

/**
 * Job photos: upload, thumbnails, lightbox and delete (spec §2.2, §2.6, §7.5).
 * The same component serves all three attachment points and both sides of the
 * job — the customer sees the provider's photos read-only, and vice versa.
 */
export function ImageUploader({ jobId, kind, progressId, canUpload = false, label, onChange }: Props) {
  const [items, setItems] = useState<Attachment[] | null>(null)
  const [limits, setLimits] = useState<ImageLimits | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  function load() {
    return api<Attachment[]>(`/jobs/${jobId}/images?kind=${kind}`, 'GET')
      .then((all) => setItems(progressId ? all.filter((a) => a.progressId === progressId) : all))
      .catch(() => setItems([]))
  }

  useEffect(() => {
    load()
    if (canUpload) {
      api<ImageLimits>(`/jobs/${jobId}/images/limits`, 'GET').then(setLimits).catch(() => setLimits(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, kind, progressId, canUpload])

  // Thumbnails come through the authenticated endpoint, so each one is fetched
  // as a blob and turned into an object URL. Revoked on unmount to avoid a leak.
  useEffect(() => {
    if (!items) return
    let cancelled = false
    const created: string[] = []
    items.forEach((item) => {
      if (thumbs[item.id]) return
      apiObjectUrl(`/images/${item.id}?thumb=true`)
        .then((url) => {
          if (cancelled) { URL.revokeObjectURL(url); return }
          created.push(url)
          setThumbs((prev) => ({ ...prev, [item.id]: url }))
        })
        .catch(() => { /* a broken thumbnail shouldn't break the page */ })
    })
    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useEffect(() => () => { Object.values(thumbs).forEach((url) => URL.revokeObjectURL(url)) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [])

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(''); setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        const query = progressId ? `?kind=${kind}&progressId=${progressId}` : `?kind=${kind}`
        await apiUpload<Attachment>(`/jobs/${jobId}/images${query}`, form)
      }
      await load()
      onChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that image.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function remove(id: string) {
    setError('')
    try {
      await api(`/images/${id}`, 'DELETE')
      setThumbs((prev) => {
        if (prev[id]) URL.revokeObjectURL(prev[id])
        const next = { ...prev }
        delete next[id]
        return next
      })
      await load()
      onChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that image.')
    }
  }

  async function openFull(id: string) {
    try {
      setLightbox(await apiObjectUrl(`/images/${id}`))
    } catch {
      setError('Could not open that image.')
    }
  }

  function closeLightbox() {
    if (lightbox) URL.revokeObjectURL(lightbox)
    setLightbox(null)
  }

  const count = items?.length ?? 0
  const atMax = limits !== null && count >= limits.maxImages
  const belowMin = limits !== null && limits.minImages > 0 && count < limits.minImages

  if (!canUpload && count === 0) return null

  return (
    <div className="img-block">
      {label && <div className="img-label">{label}</div>}
      {error && <div className="msg err">{error}</div>}

      <div className="img-grid">
        {items === null && <span className="img-loading">Loading photos…</span>}
        {items?.map((item) => (
          <div className="img-tile" key={item.id}>
            {thumbs[item.id] ? (
              <button type="button" className="img-thumb" onClick={() => openFull(item.id)} title="View full size">
                <img src={thumbs[item.id]} alt={item.originalFilename ?? 'Job photo'} />
              </button>
            ) : (
              <span className="img-thumb img-placeholder" />
            )}
            {canUpload && (
              <button type="button" className="img-remove" onClick={() => remove(item.id)} title="Remove photo">×</button>
            )}
          </div>
        ))}

        {canUpload && !atMax && (
          <button type="button" className="img-add" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? 'Uploading…' : '+ Add photo'}
          </button>
        )}
      </div>

      {canUpload && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => onPick(e.target.files)}
          />
          {limits && (
            <div className={`img-note${belowMin ? ' warn' : ''}`}>
              {count} of {limits.maxImages} · up to {limits.maxImageMb} MB each
              {limits.minImages > 0 && ` · at least ${limits.minImages} required`}
              {limits.planName && ` · ${limits.planName} plan`}
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div className="img-lightbox" role="dialog" aria-label="Photo" onClick={closeLightbox}>
          <img src={lightbox} alt="Job photo" />
          <button type="button" className="img-lightbox-close" onClick={closeLightbox}>Close</button>
        </div>
      )}
    </div>
  )
}
