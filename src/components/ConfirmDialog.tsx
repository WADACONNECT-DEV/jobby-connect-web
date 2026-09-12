import { ReactNode, useEffect } from 'react'

/**
 * In-app confirmation dialog (UAT Round 4 §5).
 *
 * Replaces window.confirm, which renders the browser's own pop-up and looks
 * nothing like the rest of the product. Styled to match the Decline confirmation
 * built in Round 3, so every "are you sure?" in the app now looks the same.
 *
 * Escape closes it, the backdrop closes it, and the confirm button takes focus
 * on open so it can be confirmed from the keyboard.
 */
interface Props {
  open: boolean
  title: string
  /** Body text, or richer content if a plain sentence isn't enough. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Style the confirm button as destructive (declines, discards). */
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, children,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, busy = false,
  onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dlg-backdrop" onMouseDown={onCancel}>
      <div
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="dlg-title">{title}</h3>
        {children && <div className="dlg-body">{children}</div>}
        <div className="dlg-actions">
          <button type="button" className="btn btn-ghost-dark btn-sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-amber'}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
