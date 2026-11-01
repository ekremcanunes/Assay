import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview } from '@/hooks/queries'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, PageTab } from '@/components/Page'
import StockPanel from '@/components/market/StockPanel'
import StockDetail from '@/components/market/StockDetail'
import GoldFxPanel from '@/components/market/GoldFxPanel'
import { num, pct, pctCls } from '@/components/market/marketFormat'
import { sessionOf, formatAsOf } from '@/lib/marketSession'

// Başlıktaki mini gösterge (md+)
function Ticker({ label, quote }) {
  if (!quote) return null
  return (
    <span className="chip-neutral tabular hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-micro md:inline-flex">
      <span className="font-medium">{label}</span>
      <span className="font-semibold text-foreground">{num(quote.price)}</span>
      <span className={`font-semibold ${pctCls(quote.changePercent)}`}>{pct(quote.changePercent)}</span>
    </span>
  )
}

// Piyasa: iki sekme (Borsa · Altın & Döviz), seçili sekme adreste (?tab=goldfx) — yenileyince aynısı açılır.
// Borsa'da lg+ ekranda sağda seçili hissenin sabit paneli; ilk açılışta en çok yükselen seçilidir.
export default function Market() {
  const { t } = useLanguage()
  const wide = useMediaQuery('(min-width: 64rem)')
  const { data, isLoading } = useMarketOverview()
  const [params, setParams] = useSearchParams()
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const tab = params.get('tab') === 'goldfx' ? 'goldfx' : 'stocks'
  const setTab = (next) => setParams(next === 'goldfx' ? { tab: 'goldfx' } : {}, { replace: true })

  const stocks = data?.stocks ?? []
  const bist100 = data?.indices?.find((i) => i.symbol === 'XU100.IS')
  const bist30 = data?.indices?.find((i) => i.symbol === 'XU030.IS')
  const usd = data?.strip?.find((q) => q.symbol === 'USD')
  const topGainer = stocks.reduce((b, s) => ((s.changePercent ?? -Infinity) > (b?.changePercent ?? -Infinity) ? s : b), null)
  const selected = stocks.find((s) => s.symbol === selectedSymbol) ?? topGainer
  // Hacim sırası (1 = en çok işlem gören) — panelde "BIST 30'da 3. hisse"
  const volumeRank = selected ? [...stocks].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1)).indexOf(selected) + 1 : null

  // Backend'in verdiği gerçek son işlem zamanı (tarayıcının veriyi aldığı an değil)
  const { asOf } = sessionOf(bist100)
  // md+ ekranda fiyat zamanı üstteki durum şeridinde; şerit mobilde yok → başlıkta yalnız mobilde
  const meta = (
    <>
      {t('market.delayNote')}
      {asOf && <span className="md:hidden"> · {t('status.pricesAsOf').replace('{time}', formatAsOf(asOf))}</span>}
    </>
  )

  return (
    <Page
      eyebrow={t('nav.sectionMarket')}
      title={t('nav.market')}
      meta={meta}
      actions={
        <>
          <Ticker label="BIST 100" quote={bist100} />
          <Ticker label="USD/TRY" quote={usd} />
        </>
      }
      tabs={
        <>
          <PageTab active={tab === 'stocks'} onClick={() => setTab('stocks')}>{t('market.tileStocks')}</PageTab>
          <PageTab active={tab === 'goldfx'} onClick={() => setTab('goldfx')}>{t('market.tileGoldFx')}</PageTab>
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : tab === 'stocks' ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          <div className="min-w-0">
            <StockPanel stocks={stocks} bist30={bist30} bist100={bist100} selected={selected?.symbol} onSelect={setSelectedSymbol} />
          </div>
          {/* Sağ panel: başlığın altında yapışık kalır, uzunsa kendi içinde kayar */}
          {wide && selected && (
            <div className="sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain">
              <StockDetail stock={selected} volumeRank={volumeRank} />
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-ui text-muted-foreground">{t('goldfx.sourceNote')}</p>
          <GoldFxPanel strip={data?.strip ?? []} />
        </>
      )}
    </Page>
  )
}
