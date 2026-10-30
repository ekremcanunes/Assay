import { useLanguage } from '../contexts/LanguageContext'
import { cn } from '../lib/utils'

// Tam ekran yükleniyor durumu. Görünen yazı yok: ekran font dosyası inmeden çizildiği için
// metin yedek fontla görünürdü. Metin yalnız ekran okuyucular için (sr-only).
export default function PageLoader({ label, className }) {
  const { t } = useLanguage()
  return (
    <div role="status" className={cn('flex min-h-screen items-center justify-center bg-background', className)}>
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground motion-reduce:animate-none"
      />
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </div>
  )
}
