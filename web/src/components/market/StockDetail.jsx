import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory } from '@/hooks/queries'
import PriceChart from '@/components/PriceChart'
import { catOf } from '@/lib/assetColors'
import { buyPath } from '@/lib/portfolioCategories'
import { assetPath } from '@/lib/assetPath'
import { cn } from '@/lib/utils'
import { ArrowUpRight, Plus } from 'lucide-react'
import { num, pct } from './marketFormat'
import { StockStats } from './StockStats'

// Masaüstü Piyasa: seçili BIST 30 hissesinin sağda sabit duran paneli.
// Hiç bilmeyen biri için: rakam + düz cümle. Yalnız mevcut veri (Yahoo quote + 1 yıllık seri).
export default function StockDetail({ stock: s, volumeRank }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: history } = usePriceHistory('BIST', s.symbol, 'Stock', '1y')
  const cat = catOf('Stock')
  const change = s.previousClose != null ? s.price - s.previousClose : null
  const up = (s.changePercent ?? 0) >= 0

  return (
    <aside className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ui font-bold', cat.tint, cat.text)}>
          {s.symbol.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-figure font-bold text-foreground">{s.symbol}</span>
            <span className="label rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">BIST</span>
          </div>
          <div className="truncate text-ui text-foreground">{s.name}</div>
        </div>
        <Link
          to={assetPath('BIST', s.symbol)}
          className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-ui font-semibold text-primary hover:bg-primary/10"
        >
          {t('asset.open')} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <div className="tabular text-title font-bold text-foreground">{num(s.price)} ₺</div>
          <div className="text-micro text-muted-foreground">
            {s.previousClose != null && <>{t('market.prevClose')} <span className="tabular font-semibold text-foreground">{num(s.previousClose)} ₺</span></>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn('tabular rounded-lg px-2.5 py-1 text-ui font-semibold', up ? 'chip-up' : 'chip-down')}>{pct(s.changePercent)}</span>
          {change != null && (
            <span className={cn('tabular text-micro font-semibold', up ? 'text-up' : 'text-down')}>
              {change >= 0 ? '+' : ''}{num(change)} ₺
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <PriceChart key={s.symbol} market="BIST" symbol={s.symbol} assetType="Stock" exchange="BIST" height={200} />
      </div>

      <StockStats s={s} candles={history?.candles} volumeRank={volumeRank} />

      <button
        type="button"
        onClick={() => navigate(buyPath({ type: 'Stock', symbol: s.symbol, market: 'BIST', name: s.name }))}
        className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-body font-semibold text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        {t('market.addToPortfolio')}
      </button>
    </aside>
  )
}
