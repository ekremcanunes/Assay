import { useState } from 'react'
import { ChartColumn } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Page, GhostAction } from '@/components/Page'
import WatchlistPanel from '@/components/market/WatchlistPanel'
import { cn } from '@/lib/utils'

// İzleme listesi sayfası (/watchlist). İçerik Piyasa · İzlediklerim sekmesiyle aynı bileşen; özet yalnız burada.
export default function Watchlist() {
  const { t } = useLanguage()
  const [summaryOpen, setSummaryOpen] = useState(false)
  return (
    <Page
      eyebrow={t('nav.market')}
      title={t('nav.watchlist')}
      meta={t('watch.meta')}
      actions={
        <GhostAction
          onClick={() => setSummaryOpen((o) => !o)}
          aria-pressed={summaryOpen}
          aria-controls="watch-summary"
          className={cn(summaryOpen && 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/10')}
        >
          <ChartColumn className="h-3.5 w-3.5" aria-hidden="true" />
          {t('watch.summary')}
        </GhostAction>
      }
    >
      <WatchlistPanel showSummary={summaryOpen} />
    </Page>
  )
}
