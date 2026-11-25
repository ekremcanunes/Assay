import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { DURATION_MS, dismiss, getSnapshot, pause, resume, subscribe } from '@/lib/toast'
import { cn } from '@/lib/utils'

// Bildirimler (BL-25): md+ sağ üst köşe (sağdan kayar), mobilde üstte tam genişlik (yukarıdan iner).
// Başarı kobalt, hata destructive; kâr/zarar renkleri kullanılmaz (IL-04). Uygulamaya bir kez yerleşir (App.jsx).
const TONE = {
  success: { icon: CheckCircle2, text: 'text-primary', wash: 'bg-primary/10', stripe: 'border-l-primary', bar: 'bg-primary' },
  error: { icon: AlertCircle, text: 'text-destructive', wash: 'bg-destructive/10', stripe: 'border-l-destructive', bar: 'bg-destructive' },
  info: { icon: Info, text: 'text-muted-foreground', wash: 'bg-secondary', stripe: 'border-l-input', bar: 'bg-input' },
}

export default function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot)
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-3 z-[60] flex flex-col items-stretch gap-2 md:inset-x-auto md:right-5 md:top-5 md:w-[400px]"
    >
      {items.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>,
    document.body,
  )
}

function ToastItem({ toast: t }) {
  const tone = TONE[t.type]
  const Icon = tone.icon
  const [paused, setPaused] = useState(false)
  return (
    <button
      type="button"
      role={t.type === 'error' ? 'alert' : 'status'}
      onClick={() => dismiss(t.id)}
      onMouseEnter={() => { pause(t.id); setPaused(true) }}
      onMouseLeave={() => { resume(t.id); setPaused(false) }}
      className={cn(
        'pointer-events-auto relative flex min-h-14 w-full items-center gap-3 overflow-hidden rounded-xl border border-l-[3px] border-border bg-popover py-3 pl-3.5 pr-4 text-left shadow-float',
        tone.stripe,
        t.leaving ? 'toast-out' : 'toast-in',
      )}
    >
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tone.wash, tone.text)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-body font-medium text-foreground">{t.message}</span>
      {/* Kalan süre: imleç üstündeyken durur; ayrılınca baştan dolar (key ile yeniden başlar) */}
      {!paused && !t.leaving && (
        <span
          key={`${t.id}-bar`}
          aria-hidden="true"
          className={cn('toast-bar absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-60', tone.bar)}
          style={{ animationDuration: `${DURATION_MS}ms` }}
        />
      )}
    </button>
  )
}
