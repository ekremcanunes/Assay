import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useHoldings, useInstrument, usePriceHistory, useQuote } from '@/hooks/queries'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Page, PrimaryAction } from '@/components/Page'
import PageLoader from '@/components/PageLoader'
import PriceChart from '@/components/PriceChart'
import WatchButton from '@/components/WatchButton'
import { StockStats } from '@/components/market/StockStats'
import { num, pct } from '@/components/market/marketFormat'
import { buyPath } from '@/lib/portfolioCategories'
import { catOf } from '@/lib/assetColors'
import { cn } from '@/lib/utils'

// Varlık sayfası (/market/:market/:symbol) — şimdilik hisse ve ETF (BIST, US).
// Yalnız elimizdeki veri: Yahoo quote + 1 yıllık seri + kullanıcının kendi pozisyonu (VR-01).
const MARKETS = ['BIST', 'US']
const curOf = (c) => (c === 'USD' ? '$' : '₺')

export default function AssetDetail() {
  const { market: rawMarket, symbol: rawSymbol } = useParams()
  const market = rawMarket?.toUpperCase()
  const symbol = rawSymbol?.toUpperCase()
  const supported = MARKETS.includes(market)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 48rem)') // md

  const quote = useQuote(supported ? market : null, supported ? symbol : null)
  const instrument = useInstrument(supported ? market : null, supported ? symbol : null)
  const { data: history } = usePriceHistory(market, supported ? symbol : null, 'Stock', '1y')
  const { data: holdings = [] } = useHoldings()

  if (supported && (quote.isLoading || instrument.isLoading)) return <PageLoader />
  if (!supported || (!quote.data && !instrument.data)) return <NotFound t={t} />

  const q = quote.data
  const info = instrument.data
  const currency = q?.nativeCurrency || info?.currency || 'TRY'
  const cur = curOf(currency)
  const price = q ? (q.nativeCurrency === 'USD' ? q.priceInUsd : q.priceInTry) : null
  const change = price != null && q?.previousClose ? price - q.previousClose : null
  const changePct = change != null ? (change / q.previousClose) * 100 : null
  const up = (changePct ?? 0) >= 0
  const exchange = info?.exchange || q?.exchange || market
  const holding = holdings.find((h) => h.assetType === 'Stock' && h.market === market && h.symbol === symbol)
  const cat = catOf('Stock')
  const buy = () => navigate(buyPath({ type: 'Stock', symbol, market, name: info?.name }))

  return (
    <Page
      back={{ label: t('nav.market'), onClick: () => (window.history.length > 1 ? navigate(-1) : navigate('/market')) }}
      eyebrow={`${exchange} · ${currency}`}
      title={symbol}
      meta={info?.name && <span className="text-foreground">{info.name}</span>}
      // Mobilde eylemler alttaki sabit çubukta; başlıkta boş kutu yer kaplamasın diye yalnız md+ verilir
      actions={wide && (
        <div className="flex items-center gap-2">
          <WatchButton assetType="Stock" market={market} symbol={symbol} />
          <PrimaryAction onClick={buy}><Plus className="h-4 w-4" />{t('market.addToPortfolio')}</PrimaryAction>
        </div>
      )}
    >
      {/* Mobil: eylemler alt çubuğun hemen üstünde sabit (MB-06); md+ başlıkta */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <WatchButton assetType="Stock" market={market} symbol={symbol} iconOnly />
        <button
          type="button"
          onClick={buy}
          className="press flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-body font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('market.addToPortfolio')}
        </button>
      </div>
      <div className="grid gap-4 pb-24 md:pb-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
            {price != null ? (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="tabular text-title font-bold text-foreground">{num(price)} {cur}</div>
                  {q.previousClose != null && (
                    <div className="text-micro text-muted-foreground">
                      {t('market.prevClose')} <span className="tabular font-semibold text-foreground">{num(q.previousClose)} {cur}</span>
                    </div>
                  )}
                </div>
                {changePct != null && (
                  <div className="flex items-center gap-2">
                    <span className={cn('tabular text-ui font-semibold', up ? 'text-up' : 'text-down')}>
                      {change >= 0 ? '+' : ''}{num(change)} {cur}
                    </span>
                    <span className={cn('tabular rounded-sm px-2 py-0.5 text-ui font-semibold', up ? 'chip-up' : 'chip-down')}>{pct(changePct)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-ui text-muted-foreground">{t('asset.noPrice')}</p>
            )}
            <div className="mt-4">
              <PriceChart key={`${market}:${symbol}`} market={market} symbol={symbol} assetType="Stock" exchange={market} height={320} />
            </div>
            {price != null && <StockStats s={{ ...q, price }} candles={history?.candles} cur={cur} />}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          {holding && (
            <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
              <div className="label text-muted-foreground">{t('asset.inPortfolio')}</div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                <Stat label={t('assets.quantity')} value={num(holding.quantity, 4).replace(/,?0+$/, '')} />
                <Stat label={t('assets.avgCost')} value={holding.avgCostBasis != null ? `${num(holding.avgCostBasis)} ${curOf(holding.currency)}` : '—'} />
                <Stat label={t('assets.value')} value={`${num(holding.valueInTry)} ₺`} />
                <Stat
                  label={t('asset.pl')}
                  value={holding.unrealizedProfitLoss != null ? `${holding.unrealizedProfitLoss >= 0 ? '+' : ''}${num(holding.unrealizedProfitLoss)} ${curOf(holding.currency)}` : '—'}
                  sub={holding.unrealizedProfitLossPercent != null ? pct(holding.unrealizedProfitLossPercent) : null}
                  tone={holding.unrealizedProfitLoss == null ? null : holding.unrealizedProfitLoss >= 0 ? 'text-up' : 'text-down'}
                />
              </div>
              <Link to="/assets" className="mt-4 inline-flex min-h-11 items-center text-ui font-semibold text-primary hover:underline">
                {t('asset.openPortfolio')} →
              </Link>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
            <div className="flex items-center gap-3">
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ui font-bold', cat.tint, cat.text)}>
                {symbol.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <div className="text-body font-semibold text-foreground">{symbol}</div>
                {info?.name && <div className="truncate text-ui text-foreground">{info.name}</div>}
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-ui">
              <Row label={t('asset.exchange')} value={exchange} />
              <Row label={t('asset.currency')} value={currency} />
              <Row label={t('asset.market')} value={market} />
            </dl>
          </section>
        </aside>
      </div>
    </Page>
  )
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className="min-w-0">
      <div className="text-micro text-muted-foreground">{label}</div>
      <div className={cn('tabular truncate text-body font-semibold text-foreground', tone)}>{value}</div>
      {sub && <div className={cn('tabular text-micro font-semibold', tone)}>{sub}</div>}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function NotFound({ t }) {
  return (
    <Page title={t('asset.notFound')}>
      <div className="max-w-md rounded-xl border border-border bg-card p-5 shadow-card">
        <p className="text-body text-foreground">{t('asset.notFoundText')}</p>
        <Link to="/market" className="mt-4 inline-flex min-h-11 items-center text-ui font-semibold text-primary hover:underline">
          ← {t('nav.market')}
        </Link>
      </div>
    </Page>
  )
}
