import { Link } from 'react-router-dom'
import { Loader2, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRemoveWatch, useWatchlist } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { catOf } from '@/lib/assetColors'
import { assetPath } from '@/lib/assetPath'
import { apiErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { num, pct, pctCls } from './marketFormat'

const curOf = (c) => (c === 'USD' ? '$' : '₺')

// Piyasa · İzlediklerim: almadan takip edilen varlıklar. Hisse satırı varlık sayfasına, altın/döviz Altın & Döviz sekmesine gider.
export default function WatchlistPanel() {
  const { t, lang } = useLanguage()
  const { data: items = [], isLoading, isError } = useWatchlist()
  const remove = useRemoveWatch()
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'

  if (isLoading) return <Skeleton className="h-64 w-full max-w-3xl" />
  if (isError) return <p className="text-ui text-muted-foreground">{t('watch.error')}</p>
  if (items.length === 0) {
    return (
      <div className="max-w-3xl rounded-xl border border-dashed border-border p-6 text-ui text-muted-foreground">
        {t('watch.empty')}{' '}
        <Link to="/market" className="font-semibold text-primary hover:underline">{t('market.tileStocks')} →</Link>
      </div>
    )
  }

  return (
    <ul className="max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {items.map((w) => {
        const cat = catOf(w.assetType)
        const cur = curOf(w.currency)
        const title = w.assetType === 'Gold' ? t('assets.gold') : w.symbol
        const sub = w.assetType === 'Stock' ? w.name : w.assetType === 'Currency' ? `${w.symbol}/TRY` : t('watch.goldUnit')
        const to = w.assetType === 'Stock' ? assetPath(w.market, w.symbol) : '/market?tab=goldfx'
        const since = new Date(w.createdAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
        const up = (w.changePercent ?? 0) >= 0
        return (
          <li key={w.id} className="flex items-center gap-2 pr-2">
            <Link to={to} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-secondary">
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ui font-bold', cat.tint, cat.text)}>
                {(w.assetType === 'Gold' ? 'AU' : w.symbol).slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-foreground">{title}</span>
                <span className="block truncate text-micro text-muted-foreground">{sub}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tabular block text-body font-semibold text-foreground">{w.price != null ? `${num(w.price)} ${cur}` : '—'}</span>
                {w.changePercent != null && (
                  <span className={cn('tabular mt-0.5 inline-block rounded-sm px-1.5 text-micro font-semibold', up ? 'chip-up' : 'chip-down')}>{pct(w.changePercent)}</span>
                )}
                {w.sinceAddedPercent != null && (
                  <span className="tabular block text-micro text-muted-foreground">
                    {/* 360px'te tarih sembol sütununu daraltıyor: telefonda yalnız yüzde */}
                    <span className="hidden sm:inline">{t('watch.since').replace('{date}', since)} </span><span className={cn('font-semibold', pctCls(w.sinceAddedPercent))}>{pct(w.sinceAddedPercent)}</span>
                  </span>
                )}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => remove.mutate(w.id, {
                onSuccess: () => toast.info(t('watch.removed').replace('{name}', title)),
                onError: (err) => toast.error(apiErrorMessage(err, t)),
              })}
              disabled={remove.isPending && remove.variables === w.id}
              aria-label={t('watch.remove')}
              title={t('watch.remove')}
              className="press grid h-11 w-11 shrink-0 place-items-center rounded-lg text-primary hover:bg-secondary disabled:opacity-60"
            >
              {remove.isPending && remove.variables === w.id
                ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <Star className="h-4 w-4 fill-current" aria-hidden="true" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
