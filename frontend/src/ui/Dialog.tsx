import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  /** Buttons. The dismissive one goes first, so the destructive one is not
      where a thumb lands by reflex. */
  actions?: ReactNode
  className?: string
}

/**
 * A modal, built on the native `<dialog>`.
 *
 * The platform already does focus trapping, the top layer, inertness of the
 * page behind, Escape to close, and the backdrop. Every one of those is a
 * thing hand-rolled modals get subtly wrong, so this component's whole job is
 * to open and close the real one and get out of the way.
 */
export function Dialog({ open, onClose, title, children, actions, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Generated, not literal: two mounted dialogs sharing one id would leave
  // aria-labelledby pointing at whichever happened to render first.
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Fires for Escape too, so this is the single close path.
    const onCancelOrClose = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('cancel', onCancelOrClose)
    return () => el.removeEventListener('cancel', onCancelOrClose)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      className={cx('ph-dialog', className)}
      aria-labelledby={titleId}
      onClick={(e) => {
        // The backdrop is the dialog element itself; the panel is a child.
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="ph-dialog__panel">
        <h2 className="ph-dialog__title" id={titleId}>
          {title}
        </h2>
        {children && <div className="ph-dialog__body">{children}</div>}
        {actions && <div className="ph-dialog__actions">{actions}</div>}
      </div>
    </dialog>
  )
}
