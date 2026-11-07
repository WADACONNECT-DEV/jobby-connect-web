import { useEffect, useMemo, useRef, useState } from 'react'
import { type ImageLimits } from '../../types'

/**
 * Photos chosen on the request form before the request exists (redesign
 * step 7). Holds plain File objects; NewRequest.tsx uploads them once the job
 * has been created, with the same call ImageUploader uses.
 *
 * The checks here (type, size, number) are early warnings using the customer
 * limits from GET /images/limits. The upload call is still the authority.
 */

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  limits: ImageLimits | null
  disabled?: boolean
}

export function PhotoPicker({ files, onChange, limits, disabled = false }: Props) {
  const input = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [warning, setWarning] = useState('')

  // Thumbnails for the chosen files, released when they change or the page closes.
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])

  function add(list: FileList | null) {
    if (!list || list.length === 0) return
    const problems: string[] = []
    const next = [...files]
    for (const file of Array.from(list)) {
      if (!ACCEPT.includes(file.type)) {
        problems.push(`${file.name} isn't a JPG, PNG or WebP image`)
        continue
      }
      if (limits && file.size > limits.maxImageMb * 1024 * 1024) {
        problems.push(`${file.name} is over ${limits.maxImageMb} MB`)
        continue
      }
      if (limits && next.length >= limits.maxImages) {
        problems.push(`only ${limits.maxImages} photo${limits.maxImages === 1 ? '' : 's'} can be added`)
        break
      }
      next.push(file)
    }
    setWarning(problems.length ? `Not added: ${problems.join('; ')}.` : '')
    onChange(next)
    if (input.current) input.current.value = ''
  }

  function remove(index: number) {
    setWarning('')
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="rq-photos">
      <div
        className={`rq-drop${dragging ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) add(e.dataTransfer.files) }}
      >
        <ImageIcon />
        <strong>Add photos of the job</strong>
        <span>
          Drag photos here or{' '}
          <button type="button" className="rq-choose" disabled={disabled} onClick={() => input.current?.click()}>
            choose files
          </button>{' '}
          · JPG, PNG or WebP
        </span>
        {limits && (
          <span className="rq-drop-limit">
            Up to {limits.maxImages} photo{limits.maxImages === 1 ? '' : 's'}, {limits.maxImageMb} MB each
          </span>
        )}
        <input ref={input} type="file" accept={ACCEPT.join(',')} multiple hidden
          onChange={(e) => add(e.target.files)} />
      </div>

      {warning && <p className="rq-warn" role="alert">{warning}</p>}

      {files.length > 0 && (
        <ul className="rq-thumbs" aria-label="Photos to send">
          {files.map((file, i) => (
            <li className="rq-thumb" key={`${file.name}-${i}`}>
              <img src={urls[i]} alt={file.name} />
              <button type="button" className="rq-thumb-x" disabled={disabled}
                aria-label={`Remove ${file.name}`} onClick={() => remove(i)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F2A4A" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>
  )
}
