import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory } from '@/hooks/queries'
import { AreaSpark } from '@/components/AreaSpark'
import { catOf } from '@/lib/assetColors'
import { formatPct } from '@/lib/format'
import { slugOf, CATEGORY_SERIES } from '@/lib/portfolioCategories'
import { cn } from '@/lib/utils'
import { Banknote, Coins, TrendingUp } from 'lucide-react'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)
const ICONS = { Stock: TrendingUp, Gold: Coins, Currency: Banknote }

// Portföy kategori kartı: ad + adet + pay, değer + K/Z, kategorinin temsilci fiyat serisi, pay çubuğu.
// Dokununca /assets/<kategori> detayına büyür (view-transition adları StoryHero ile aynı).
export function CategoryCard({ summary, onOpen, className }) {
  const { t } = useLanguage()
  const type = summary.key
  const s = CATEGORY_SERIES[type]
  const { data: history } = usePriceHistory(s.market, s.symbol, s.assetType, '1y')
  const name = t(`assets.${type.toLowerCase()}`)
  const cat = catOf(type)
  const vt = `cat-${slugOf(type)}`
  const Icon = ICONS[type]
  const pct = summary.changePct

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('portfolio.open').replace('{name}', name)}
      style={{ viewTransitionName: vt }}
      className={cn(
        'press w-full rounded-xl border border-border bg-card p-4 text-left text-foreground shadow-card hover:border-input',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', cat.tint, cat.text)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold" style={{ viewTransitionName: `${vt}-name` }}>{name}</span>
          <span className="block text-micro text-muted-foreground">
            {summary.count ? `${summary.count} ${t('overview.assetCount')}` : t('portfolio.empty')}
          </span>
        </span>
        <span className="tabular shrink-0 rounded-sm bg-primary/10 px-2 py-0.5 text-micro font-semibold text-primary">
          %{Math.round(summary.share * 100)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
        <span className="min-w-0">
          <span className="block text-micro text-muted-foreground">{t('assets.currentValue')}</span>
          <span className="tabular block text-figure font-bold" style={{ viewTransitionName: `${vt}-val` }}>{money(summary.value)}</span>
          <span
            className={cn(
              'tabular mt-1 inline-flex rounded-sm px-2 py-0.5 text-micro font-semibold',
              pct == null ? 'chip-neutral' : pct >= 0 ? 'chip-up' : 'chip-down'
            )}
          >
            {formatPct(pct)}
          </span>
        </span>
        {/* Temsilci seri — portföy değeri değil, altında etiketle yazılı */}
        <span className="flex w-28 shrink-0 flex-col items-end">
          <AreaSpark values={(history?.candles ?? []).map((c) => c.close)} color={cat.color} className="h-10 w-full" />
          <span className="mt-1 max-w-full truncate text-micro text-muted-foreground">{t(`portfolio.series.${type}`)}</span>
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', cat.dot)} style={{ width: `${summary.share * 100}%` }} />
      </div>
    </button>
  )
}
