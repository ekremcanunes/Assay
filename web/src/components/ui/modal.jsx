import { useEffect } from 'react'

/*
  Ortak makbuz-stili modal. Her sayfada küçük değişikliklerle kullanılır.
  Props: open, onClose, title (daktilo makbuz başlığı), subtitle, children, actions.
*/
export function Modal({ open, onClose, title, subtitle, children, actions, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className={`ledger-modal w-full ${maxWidth} border-2 border-foreground bg-card p-6 shadow-ledger-strong`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-6 border-b border-dashed border-foreground pb-4 text-center">
            <div className="font-display text-head font-bold tracking-tight text-foreground">{title}</div>
            {subtitle && (
              <div className="mt-1.5 label tracking-[0.18em] text-muted-foreground">{subtitle}</div>
            )}
          </div>
        )}
        {children}
        {actions && <div className="mt-6 flex gap-3">{actions}</div>}
      </div>
    </div>
  )
}
