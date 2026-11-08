import { useLanguage } from '@/contexts/LanguageContext'
import { Page } from '@/components/Page'
import WatchlistPanel from '@/components/market/WatchlistPanel'

// İzleme listesi sayfası (/watchlist). İçerik Piyasa · İzlediklerim sekmesiyle aynı bileşen.
export default function Watchlist() {
  const { t } = useLanguage()
  return (
    <Page eyebrow={t('nav.market')} title={t('nav.watchlist')} meta={t('watch.meta')}>
      <WatchlistPanel />
    </Page>
  )
}
