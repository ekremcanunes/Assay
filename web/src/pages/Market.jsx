import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview, useIndexStocks } from '@/hooks/queries'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, PageTab } from '@/components/Page'
import StockPanel from '@/components/market/StockPanel'
import StockDetail from '@/components/market/StockDetail'
import GoldFxPanel from '@/components/market/GoldFxPanel'
import WatchlistPanel from '@/components/market/WatchlistPanel'
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

// Borsa sekmesindeki endeks segmenti. Kod, backend'deki IndexConstituents.IndexCode ile aynıdır.
const INDEXES = { XU030: 'BIST 30', XU100: 'BIST 100' }

// Henüz listesi olmayan ABD borsaları (instrument senkronundaki kaynaklar): sekme anahtarı → borsa adı
const US_EXCHANGES = { nasdaq: 'NASDAQ', nyse: 'NYSE' }

// Piyasa: beş sekme (BIST · NASDAQ · NYSE · Altın & Döviz · İzlediklerim), seçili sekme adreste
// (?tab=nasdaq|nyse|goldfx|watch) — yenileyince aynısı açılır.
// NASDAQ ve NYSE sekmeleri şimdilik yalnız "Yakında" yer tutucusu.
// Borsa'da endeks segmenti (BIST 30 · BIST 100) de adreste (?index=xu100); BIST 30 piyasa özetiyle gelir,
// BIST 100 yalnız seçilince ayrı istekle yüklenir.
// Borsa'da lg+ ekranda sağda seçili hissenin sabit paneli; ilk açılışta en çok yükselen seçilidir.
export default function Market() {
  const { t } = useLanguage()
  const wide = useMediaQuery('(min-width: 64rem)')
  const { data, isLoading } = useMarketOverview()
  const [params, setParams] = useSearchParams()
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const tab = ['nasdaq', 'nyse', 'goldfx', 'watch'].includes(params.get('tab')) ? params.get('tab') : 'stocks'
  const setTab = (next) => setParams(next === 'stocks' ? {} : { tab: next }, { replace: true })
  const indexCode = params.get('index') === 'xu100' ? 'XU100' : 'XU030'
  const setIndexCode = (next) => setParams(next === 'XU100' ? { index: 'xu100' } : {}, { replace: true })

  const bist100Query = useIndexStocks('XU100', tab === 'stocks' && indexCode === 'XU100')
  const stocks = (indexCode === 'XU100' ? bist100Query.data : data?.stocks) ?? []
  const bist100 = data?.indices?.find((i) => i.symbol === 'XU100.IS')
  const bist30 = data?.indices?.find((i) => i.symbol === 'XU030.IS')
  const usd = data?.strip?.find((q) => q.symbol === 'USD')
  const topGainer = stocks.reduce((b, s) => ((s.changePercent ?? -Infinity) > (b?.changePercent ?? -Infinity) ? s : b), null)
  const selected = stocks.find((s) => s.symbol === selectedSymbol) ?? topGainer
  // Hacim sırası (1 = en çok işlem gören) — panelde "BIST 30 içinde 3. hisse"
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
          {Object.entries(US_EXCHANGES).map(([key, name]) => (
            <PageTab key={key} active={tab === key} onClick={() => setTab(key)}>{name}</PageTab>
          ))}
          <PageTab active={tab === 'goldfx'} onClick={() => setTab('goldfx')}>{t('market.tileGoldFx')}</PageTab>
          <PageTab active={tab === 'watch'} onClick={() => setTab('watch')}>{t('watch.tab')}</PageTab>
        </>
      }
    >
      {/* İzlediklerim piyasa özetini beklemez: kendi verisi var */}
      {tab === 'watch' ? (
        <WatchlistPanel />
      ) : US_EXCHANGES[tab] ? (
        <div className="max-w-3xl rounded-xl border border-dashed border-border p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-body font-semibold text-foreground">{US_EXCHANGES[tab]}</h2>
            <span className="chip-neutral rounded-sm px-2 py-0.5 text-micro font-semibold">{t('market.soon')}</span>
          </div>
          <p className="mt-1 text-ui text-muted-foreground">{t('market.exchangeSoon').replace('{exchange}', US_EXCHANGES[tab])}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : tab === 'stocks' ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          <div className="min-w-0">
            <StockPanel
              stocks={stocks}
              bist30={bist30}
              bist100={bist100}
              indexes={INDEXES}
              indexCode={indexCode}
              onIndexChange={setIndexCode}
              loading={indexCode === 'XU100' && bist100Query.isLoading}
              selected={selected?.symbol}
              onSelect={setSelectedSymbol}
            />
          </div>
          {/* Sağ panel: başlığın altında yapışık kalır, uzunsa kendi içinde kayar */}
          {wide && selected && (
            <div className="scroll-quiet sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain">
              <StockDetail stock={selected} volumeRank={volumeRank} indexLabel={INDEXES[indexCode]} />
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
