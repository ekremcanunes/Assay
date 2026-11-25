import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRemoveWatch, useWatchlist } from '@/hooks/queries'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { catOf } from '@/lib/assetColors'
import { assetPath } from '@/lib/assetPath'
import { apiErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { num, pct, pctCls } from './marketFormat'

const PAGE_SIZE = 10

const curOf = (c) => (c === 'USD' ? '$' : '₺')

// Piyasa · İzlediklerim: almadan takip edilen varlıklar. Hisse satırı varlık sayfasına, altın/döviz Altın & Döviz sekmesine gider.
// showSummary: özet KPI'ları listenin üstünde; aç/kapa düğmesi sayfa başlığında (Watchlist).
export default function WatchlistPanel({ showSummary = false }) {
  const { t, lang } = useLanguage()
  const { data: items = [], isLoading, isError } = useWatchlist()
  const remove = useRemoveWatch()
  const [page, setPage] = useState(0)
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

  const titleOf = (w) => (w.assetType === 'Gold' ? t('assets.gold') : w.symbol)
  const pages = Math.ceil(items.length / PAGE_SIZE)
  // Son sayfadaki kalem çıkarılınca sayfa boş kalmasın
  const current = Math.min(page, pages - 1)
  const from = current * PAGE_SIZE
  const visible = items.slice(from, from + PAGE_SIZE)

  return (
    <div className="max-w-3xl space-y-3">
      {showSummary && <Summary items={items} titleOf={titleOf} t={t} />}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="hidden items-center gap-3 border-b border-border py-2 pl-4 pr-2 lg:flex" aria-hidden="true">
          <span className="label flex-1 text-muted-foreground">{t('watch.colAsset')}</span>
          <span className="label w-28 text-right text-muted-foreground">{t('watch.colAdded')}</span>
          <span className="label w-32 text-right text-muted-foreground">{t('watch.colPrice')}</span>
          <span className="label w-32 whitespace-nowrap text-right text-muted-foreground">{t('watch.colSince')}</span>
          <span className="w-11" />
        </div>

        <ul className="divide-y divide-border">
          {visible.map((w) => {
            const cat = catOf(w.assetType)
            const cur = curOf(w.currency)
            const title = titleOf(w)
            const sub = w.assetType === 'Stock' ? w.name : w.assetType === 'Currency' ? `${w.symbol}/TRY` : t('watch.goldUnit')
            const to = w.assetType === 'Stock' ? assetPath(w.market, w.symbol) : '/market?tab=goldfx'
            const addedOn = new Date(w.createdAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
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
                  <span className="hidden w-28 shrink-0 text-right lg:block">
                    <span className="tabular block text-ui font-semibold text-foreground">{w.priceAtAdd != null ? `${num(w.priceAtAdd)} ${cur}` : '—'}</span>
                    <span className="tabular block text-micro text-muted-foreground">{addedOn}</span>
                  </span>
                  <span className="shrink-0 text-right lg:w-32">
                    <span className="tabular block text-body font-semibold text-foreground">{w.price != null ? `${num(w.price)} ${cur}` : '—'}</span>
                    {w.changePercent != null && (
                      <span className={cn('tabular mt-0.5 inline-block rounded-sm px-1.5 text-micro font-semibold', up ? 'chip-up' : 'chip-down')}>{pct(w.changePercent)}</span>
                    )}
                    {/* Telefonda ayrı sütun yok: eklendiğinden beri değişim fiyatın altında */}
                    {w.sinceAddedPercent != null && (
                      <span className={cn('tabular block text-micro font-semibold lg:hidden', pctCls(w.sinceAddedPercent))}>{pct(w.sinceAddedPercent)}</span>
                    )}
                  </span>
                  <span className={cn('tabular hidden w-32 shrink-0 text-right text-ui font-semibold lg:block', pctCls(w.sinceAddedPercent))}>
                    {pct(w.sinceAddedPercent)}
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

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border py-1 pl-4 pr-2">
            <span className="tabular text-ui text-muted-foreground">
              {t('watch.pageOf')
                .replace('{from}', from + 1)
                .replace('{to}', from + visible.length)
                .replace('{total}', items.length)}
            </span>
            <span className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label={t('watch.prev')}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label={t('watch.next')}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Listenin tamamı üzerinden özet; sayfadan bağımsız. Ortalama eşit ağırlıklıdır: izleme listesinde adet yok.
function Summary({ items, titleOf, t }) {
  const withSince = items.filter((w) => w.sinceAddedPercent != null)
  const avg = withSince.length ? withSince.reduce((s, w) => s + w.sinceAddedPercent, 0) / withSince.length : null
  const sorted = [...withSince].sort((a, b) => b.sinceAddedPercent - a.sinceAddedPercent)
  const best = sorted[0]
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null
  const upToday = items.filter((w) => w.changePercent != null && w.changePercent >= 0).length
  const downToday = items.filter((w) => w.changePercent != null && w.changePercent < 0).length

  return (
    <div id="watch-summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label={t('watch.sumAvg')} note={t('watch.sumAvgNote')}>
        <span className={pctCls(avg)}>{pct(avg)}</span>
      </Kpi>
      <Kpi label={t('watch.sumToday')} note={t('watch.sumCount').replace('{n}', items.length)}>
        <span className="text-up">{upToday}↑</span>{' '}
        <span className="text-down">{downToday}↓</span>
      </Kpi>
      <Kpi label={t('watch.sumBest')} note={best ? titleOf(best) : null}>
        <span className={pctCls(best?.sinceAddedPercent)}>{pct(best?.sinceAddedPercent)}</span>
      </Kpi>
      <Kpi label={t('watch.sumWorst')} note={worst ? titleOf(worst) : null}>
        <span className={pctCls(worst?.sinceAddedPercent)}>{pct(worst?.sinceAddedPercent)}</span>
      </Kpi>
    </div>
  )
}

// BL-15: etiket → değer → not
function Kpi({ label, note, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="label truncate text-muted-foreground">{label}</div>
      <div className="tabular my-1 text-figure font-bold">{children}</div>
      {note && <div className="text-micro text-muted-foreground">{note}</div>}
    </section>
  )
}
