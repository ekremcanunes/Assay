import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { assetPath } from '@/lib/assetPath'
import { WatchStar } from '@/components/WatchButton'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSymbolSearch } from '@/hooks/queries'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import AssetDrawer from '@/components/AssetDrawer'
import { AreaSpark } from '@/components/AreaSpark'
import { Tooltip } from '@/components/ui/tooltip'
import { catOf } from '@/lib/assetColors'
import { pulse as computePulse } from '@/lib/marketPulse'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import { num, pct, pctCls, compact } from './marketFormat'

const SORTS = [
  { key: 'gainers', label: 'market.sortGainers', fn: (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity) },
  { key: 'losers', label: 'market.sortLosers', fn: (a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity) },
  { key: 'volume', label: 'market.sortMostTraded', fn: (a, b) => (b.volume ?? -1) - (a.volume ?? -1) },
]

const moodCls = { strongUp: 'text-up', up: 'text-up', flat: 'text-muted-foreground', down: 'text-down', strongDown: 'text-down' }

// Kayan detay paneli (AssetDrawer) piyasa modu için veri şekli
const toQuote = (s) => ({
  symbol: s.symbol, name: s.name, market: 'BIST', isMarketQuote: true, assetType: 'Stock', exchange: 'BIST', nativeCurrency: 'TRY',
  nativePrice: s.price, previousClose: s.previousClose, dayHigh: s.dayHigh, dayLow: s.dayLow,
  week52High: s.week52High, week52Low: s.week52Low, volume: s.volume, priceAvailable: true,
})

// Borsa bölümü: nabız kartı (BIST 100, yorum, dağılım, öne çıkanlar) + BIST 30 tablosu.
// lg+ ekranda satıra tıklamak sağdaki sabit paneli seçer (onSelect); daha darda kayan panel açılır.
export default function StockPanel({ stocks, bist30, bist100, selected, onSelect }) {
  const { t } = useLanguage()
  const wide = useMediaQuery('(min-width: 64rem)')
  const [drawer, setDrawer] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('gainers')

  const p = useMemo(() => computePulse(stocks), [stocks])
  const volumeLeader = useMemo(() => stocks.reduce((b, s) => ((s.volume ?? -1) > (b?.volume ?? -1) ? s : b), null), [stocks])

  // BIST 30 içinde arama tamamen client-side: 30 satır, ağ turu gereksiz.
  const q = query.trim().toLocaleUpperCase('tr')
  const filtered = useMemo(
    () => (q.length === 0 ? stocks : stocks.filter((s) =>
      s.symbol.toLocaleUpperCase('tr').includes(q) || (s.name ?? '').toLocaleUpperCase('tr').includes(q))),
    [stocks, q]
  )
  const sorted = useMemo(() => [...filtered].sort(SORTS.find((s) => s.key === sort).fn), [filtered, sort])

  // BIST 30 dışına taşan arama → tüm BIST evreni (Redis cache'li katalog)
  const wantsWideSearch = q.length >= 2 && filtered.length === 0
  const { data: wideResults = [], isFetching: wideSearching } = useSymbolSearch(wantsWideSearch ? query.trim() : null)

  const open = (s) => (wide && onSelect ? onSelect(s.symbol) : setDrawer(toQuote(s)))
  const isSel = (s) => wide && selected === s.symbol

  const highlights = [
    [p.top, 'market.topGainer'],
    [p.bottom, 'market.topLoser'],
    [volumeLeader, 'market.volumeLeader'],
  ].filter(([s]) => s)

  return (
    <div className="space-y-4">
      {/* Nabız kartı */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label flex items-center gap-1.5 text-muted-foreground">
              {t('market.pulse')}
              <i className={cn('h-1.5 w-1.5 rounded-full', (bist100?.changePercent ?? 0) >= 0 ? 'bg-up' : 'bg-down')} aria-hidden="true" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular text-title font-bold text-foreground">{bist100 ? num(bist100.price) : '—'}</span>
              <span className="text-ui font-medium text-muted-foreground">BIST 100</span>
            </div>
          </div>
          <span className={cn('tabular shrink-0 rounded-lg px-2.5 py-1 text-ui font-semibold',
            bist100?.changePercent == null ? 'chip-neutral' : bist100.changePercent >= 0 ? 'chip-up' : 'chip-down')}>
            {pct(bist100?.changePercent)}
          </span>
        </div>

        {bist100?.spark?.length > 1 && (
          <div className="mt-4">
            <div className="label mb-1.5 text-muted-foreground">{t('market.seriesStocks')}</div>
            <AreaSpark values={bist100.spark} color={catOf('Stock').color} className="h-20 w-full md:h-24" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border pt-4">
          <p className="text-ui text-foreground">
            {t('market.moodLead')}{' '}
            <b className={cn('font-semibold', p.mood ? moodCls[p.mood] : 'text-muted-foreground')}>
              {p.mood ? t(`market.mood.${p.mood}`) : '—'}
            </b>
          </p>
          {bist30 && (
            <span className="whitespace-nowrap text-micro text-muted-foreground">
              {t('market.bist30Index')}{' '}
              <span className="tabular font-semibold text-foreground">{num(bist30.price)}</span>
              {' · '}
              <span className={`tabular font-semibold ${pctCls(bist30.changePercent)}`}>{pct(bist30.changePercent)}</span>
            </span>
          )}
        </div>

        {/* Yükselen / değişmeyen / düşen: dağılım çubuğu + sayılar */}
        {p.total > 0 && (
          <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-secondary">
            {[['up', 'bg-up'], ['flat', 'bg-input'], ['down', 'bg-down']].map(([k, bg]) =>
              p[k] > 0 && <span key={k} className={bg} style={{ width: `${(p[k] / p.total) * 100}%` }} />)}
          </div>
        )}
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {[['up', 'bg-up', 'market.rose'], ['flat', 'bg-input', 'market.unchanged'], ['down', 'bg-down', 'market.fell']].map(([k, dot, label]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-micro text-muted-foreground">
              <i className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="tabular font-semibold text-foreground">{p.total ? p[k] : '—'}</span> {t(label)}
            </span>
          ))}
        </div>

        {/* Öne çıkan hisseler — hepsi mevcut BIST 30 verisinden */}
        {highlights.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="label mb-2.5 text-muted-foreground">{t('market.highlights')}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {highlights.map(([s, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => open(s)}
                  className={cn(
                    'press flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-input',
                    isSel(s) ? 'border-primary/50 bg-primary/5' : 'border-border'
                  )}
                >
                  <SymbolBadge symbol={s.symbol} size="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-ui font-bold text-foreground">{s.symbol}</span>
                    </span>
                    <span className="block truncate text-micro text-muted-foreground">{t(label)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tabular block text-ui font-semibold text-foreground">{num(s.price)}</span>
                    {label === 'market.volumeLeader'
                      ? <span className="tabular block text-micro text-muted-foreground">{compact(s.volume)}</span>
                      : <span className={`tabular block text-micro font-semibold ${pctCls(s.changePercent)}`}>{pct(s.changePercent)}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* BIST 30 */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-4">
          <h3 className="font-display text-body font-semibold text-foreground">BIST 30</h3>
          <span className="tabular chip-neutral rounded-sm px-1.5 py-0.5 text-micro font-medium">{sorted.length} / {stocks.length}</span>
          <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
            {/* Sıralama — segment */}
            <div role="radiogroup" className="flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-secondary p-1">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  role="radio"
                  aria-checked={sort === s.key}
                  onClick={() => setSort(s.key)}
                  className={cn('h-8 shrink-0 whitespace-nowrap rounded-lg border px-3 text-micro',
                    sort === s.key ? 'border-border bg-card font-bold text-foreground shadow-card' : 'border-transparent font-medium text-muted-foreground hover:text-foreground')}
                >
                  {t(s.label)}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('market.searchPlaceholder')}
                aria-label={t('market.searchPlaceholder')}
                className="h-10 w-full rounded-[10px] border border-border bg-card pl-9 pr-9 text-ui text-foreground placeholder:text-muted-foreground hover:border-input focus:border-primary focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label={t('common.clear')} className="absolute right-0.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobil: satır listesi */}
        <ul className="divide-y divide-border border-t border-border md:hidden">
          {sorted.map((s) => (
            <li key={s.symbol} className="flex items-center pr-2">
              <button onClick={() => open(s)} className="press flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-secondary/60">
                <span className="flex min-w-0 items-center gap-3">
                  <SymbolBadge symbol={s.symbol} size="h-9 w-9" />
                  <span className="min-w-0">
                    <span className="block text-body font-semibold text-foreground">{s.symbol}</span>
                    <span className="block truncate text-ui text-foreground">{s.name}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tabular block text-ui font-semibold text-foreground">₺{num(s.price)}</span>
                  <span className={`tabular mt-0.5 inline-flex rounded-sm px-1.5 py-0.5 text-micro font-semibold ${s.changePercent >= 0 ? 'chip-up' : 'chip-down'}`}>
                    {pct(s.changePercent)}
                  </span>
                </span>
              </button>
              <WatchStar assetType="Stock" market="BIST" symbol={s.symbol} className="h-11 w-11" />
            </li>
          ))}
        </ul>

        {/* Masaüstü: tablo */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-ui">
            <thead>
              <tr className="label border-y border-border bg-secondary/40 text-muted-foreground">
                <th className="w-10 py-2.5 pl-2"><span className="sr-only">{t('nav.watchlist')}</span></th>
                <th className="px-3 py-2.5 font-semibold">{t('assets.symbol')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('market.company')}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{t('assets.price')}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{t('market.change')}</th>
                <th className="whitespace-nowrap px-2 py-2.5 font-semibold">{t('market.dayRange')}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{t('market.volume')}</th>
                <th className="whitespace-nowrap px-2 py-2.5 text-right font-semibold">{t('market.low52')}</th>
                <th className="whitespace-nowrap py-2.5 pl-2 pr-3 text-right font-semibold">{t('market.high52')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((s) => {
                const sel = isSel(s)
                return (
                  <tr
                    key={s.symbol}
                    onClick={() => open(s)}
                    aria-selected={sel || undefined}
                    className={cn('group cursor-pointer', sel ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'hover:bg-primary/5')}
                  >
                    <td className="py-1.5 pl-2">
                      <WatchStar assetType="Stock" market="BIST" symbol={s.symbol} className="h-8 w-8" />
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-2 font-semibold', sel ? 'text-primary' : 'text-foreground')}>
                        <SymbolBadge symbol={s.symbol} />
                        {s.symbol}
                      </span>
                    </td>
                    <Tooltip content={s.name}>
                      <td className="max-w-[140px] truncate px-3 py-3 text-foreground">{s.name}</td>
                    </Tooltip>
                    <td className="tabular px-3 py-3 text-right font-medium text-foreground">{num(s.price)}</td>
                    <td className={`tabular px-3 py-3 text-right font-semibold ${pctCls(s.changePercent)}`}>{pct(s.changePercent)}</td>
                    <td className="tabular whitespace-nowrap px-2 py-3 text-muted-foreground">
                      {s.dayLow != null && s.dayHigh != null ? `${num(s.dayLow)} – ${num(s.dayHigh)}` : '—'}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-muted-foreground">{compact(s.volume)}</td>
                    <td className="tabular px-2 py-3 text-right text-muted-foreground">{s.week52Low != null ? num(s.week52Low) : '—'}</td>
                    <td className="tabular py-3 pl-2 pr-3 text-right text-muted-foreground">{s.week52High != null ? num(s.week52High) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div className="border-t border-border px-4 py-8 text-center">
            <p className="text-micro text-muted-foreground">{t('market.notInBist30')}</p>
            {wideSearching && <p className="mt-2 text-micro text-muted-foreground">{t('common.loading')}</p>}
            {wideResults.length > 0 && (
              <div className="mx-auto mt-4 max-w-sm space-y-1 text-left">
                <div className="label text-muted-foreground">{t('market.wideSearch')}</div>
                {wideResults.slice(0, 8).map((r) => (
                  <Link
                    key={`${r.symbol}-${r.exchange}`}
                    to={assetPath(r.market, r.symbol)}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-ui hover:bg-secondary"
                  >
                    <SymbolBadge symbol={r.symbol} />
                    <span className="font-semibold text-foreground">{r.symbol}</span>
                    <span className="truncate text-muted-foreground">{r.name}</span>
                    <span className="tabular ml-auto text-micro text-muted-foreground">{r.exchange}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </div>
  )
}

function SymbolBadge({ symbol, size = 'h-7 w-7' }) {
  const cat = catOf('Stock')
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-lg text-micro font-bold ${cat.tint} ${cat.text}`}>
      {symbol.slice(0, 2)}
    </span>
  )
}
