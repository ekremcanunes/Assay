import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/*
  Ortak modal. Mobilde alttan açılan sheet (20px üst köşe + tutamak), md+ ortada pencere.
  Props: open, onClose, title, subtitle, children, actions.
*/
export function Modal({ open, onClose, title, subtitle, children, actions, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Sayfa köküne çizilir (portal): atası transform taşısa bile ekrana göre konumlanır
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-veil md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className={`modal-in w-full ${maxWidth} rounded-t-sheet border border-border bg-popover p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-sheet md:rounded-2xl md:pb-6 md:shadow-float`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto -mt-3 mb-4 h-1 w-9 rounded-full bg-input md:hidden" aria-hidden="true" />
        {title && (
          <div className="mb-5">
            <div className="text-figure font-semibold tracking-tight text-foreground">{title}</div>
            {subtitle && <div className="mt-1 label text-muted-foreground">{subtitle}</div>}
          </div>
        )}
        {children}
        {actions && <div className="mt-6 flex gap-3">{actions}</div>}
      </div>
    </div>,
    document.body
  )
}
