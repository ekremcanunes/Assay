import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory, useQuote } from '@/hooks/queries'
import PriceChart from '@/components/PriceChart'
import WatchButton from '@/components/WatchButton'
import { StockStats } from '@/components/market/StockStats'
import { num, pct } from '@/components/market/marketFormat'
import { assetPath } from '@/lib/assetPath'
import { catOf } from '@/lib/assetColors'
import { cn } from '@/lib/utils'

// Alım sayfası, lg+ sağ sütun: seçili varlığın özeti. Hissede gün/52H istatistikleri de var;
// altın ve dövizde bu veriler gelmediği için yalnız fiyat + grafik (VR-01).
export default function BuySummary({ assetType, market, symbol, name }) {
  const { t } = useLanguage()
  const ready = !!assetType && !!symbol && (assetType !== 'Stock' || !!market)
  const isStock = assetType === 'Stock'
  const { data: q } = useQuote(ready ? market ?? '' : null, ready ? symbol : null)
  const { data: history } = usePriceHistory(market ?? '', ready && isStock ? symbol : null, 'Stock', '1y')

  if (!ready) {
    return (
      <aside className="hidden lg:block">
        <div className="rounded-xl border border-dashed border-border p-6 text-ui text-muted-foreground">
          {t('buy.summaryHint')}
        </div>
      </aside>
    )
  }

  const cur = q?.nativeCurrency === 'USD' ? '$' : '₺'
  const price = q ? (q.nativeCurrency === 'USD' ? q.priceInUsd : q.priceInTry) : null
  const changePct = price != null && q?.previousClose ? ((price - q.previousClose) / q.previousClose) * 100 : null
  const up = (changePct ?? 0) >= 0
  const cat = catOf(assetType)

  return (
    // Sabit panel ekrandan uzunsa sayfa değil panel kayar: yükseklik görünür alanla sınırlı.
    <aside className="hidden lg:sticky lg:top-24 lg:block">
      <section className="scroll-quiet max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="label text-muted-foreground">{t('buy.summaryTitle')}</div>
        <div className="mt-3 flex items-center gap-3">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ui font-bold', cat.tint, cat.text)}>
            {symbol.slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-body font-semibold text-foreground">{symbol}</div>
            {name && <div className="truncate text-ui text-foreground">{name}</div>}
          </div>
          <WatchButton assetType={assetType} market={market ?? ''} symbol={symbol} iconOnly className="h-9 w-9" />
          {isStock && ['BIST', 'US'].includes(market) && (
            <Link
              to={assetPath(market, symbol)}
              className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-ui font-semibold text-primary hover:bg-primary/10"
            >
              {t('asset.open')} <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {price != null && (
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="tabular text-figure font-bold text-foreground">{num(price)} {cur}</div>
            {changePct != null && (
              <span className={cn('tabular rounded-sm px-2 py-0.5 text-ui font-semibold', up ? 'chip-up' : 'chip-down')}>{pct(changePct)}</span>
            )}
          </div>
        )}

        <div className="mt-4">
          <PriceChart key={`${assetType}:${market}:${symbol}`} market={market ?? ''} symbol={symbol} assetType={assetType} exchange={market || undefined} height={220} />
        </div>

        {isStock && price != null && <StockStats s={{ ...q, price }} candles={history?.candles} cur={cur} />}
      </section>
    </aside>
  )
}
