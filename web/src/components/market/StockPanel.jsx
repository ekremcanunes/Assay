import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSymbolSearch } from '@/hooks/queries'
import AssetDrawer from '@/components/AssetDrawer'
import { Section } from '@/components/Section'
import { RangeBar } from '@/components/Sparkline'
import { catOf } from '@/lib/assetColors'
import { pulse as computePulse } from '@/lib/marketPulse'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'

const num = (v) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)
const pct = (v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—')
const pctCls = (v) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-up' : 'text-down')

// Adet hacmi — Yahoo lot sayısı döndürür, TL değil.
const compact = (v) =>
  v == null ? '—' : new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

// Değerin 52 haftalık banttaki konumu (%)
const bandPos = (q) =>
  q.week52Low != null && q.week52High != null && q.week52High > q.week52Low
    ? ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100
    : null

const SORTS = [
  { key: 'gainers', label: 'market.sortGainers', fn: (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity) },
  { key: 'losers', label: 'market.sortLosers', fn: (a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity) },
  { key: 'volume', label: 'market.sortMostTraded', fn: (a, b) => (b.volume ?? -1) - (a.volume ?? -1) },
]

const moodCls = { strongUp: 'text-up', up: 'text-up', flat: 'text-muted-foreground', down: 'text-down', strongDown: 'text-down' }

// Borsa detay içeriği: nabız (yorum + sayılar + öne çıkanlar) + arama + sıralama + BIST 30 listesi
export default function StockPanel({ stocks, bist30 }) {
  const { t } = useLanguage()
  const [drawer, setDrawer] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('gainers')

  const p = useMemo(() => computePulse(stocks), [stocks])

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

  const open = (s) =>
    setDrawer({
      symbol: s.symbol, name: s.name, market: 'BIST', isMarketQuote: true, assetType: 'Stock', exchange: 'BIST', nativeCurrency: 'TRY',
      nativePrice: s.price, previousClose: s.previousClose, dayHigh: s.dayHigh, dayLow: s.dayLow,
      week52High: s.week52High, week52Low: s.week52Low, priceAvailable: true,
    })

  return (
    <div className="space-y-4">
      {/* Nabız: yorum + sayılar + öne çıkanlar (spec §4.1) */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="label whitespace-nowrap text-muted-foreground">{t('market.today')}</span>
          {bist30 && (
            <span className="whitespace-nowrap text-micro text-muted-foreground">
              {t('market.bist30Index')}{' '}
              <span className="tabular text-foreground">{num(bist30.price)}</span>
              {' · '}
              <span className={`tabular ${pctCls(bist30.changePercent)}`}>{pct(bist30.changePercent)}</span>
            </span>
          )}
        </div>
        <p className="mt-2 text-body text-foreground">
          {t('market.moodLead')}{' '}
          <b className={cn('font-semibold', p.mood ? moodCls[p.mood] : 'text-muted-foreground')}>
            {p.mood ? t(`market.mood.${p.mood}`) : '—'}
          </b>
        </p>
        <div className="mt-3 flex gap-6">
          {[['up', 'text-up', 'market.rose'], ['flat', 'text-muted-foreground', 'market.unchanged'], ['down', 'text-down', 'market.fell']].map(([k, cls, label]) => (
            <div key={k} className="flex flex-col">
              <span className={`tabular text-head font-semibold leading-none ${cls}`}>{p.total ? p[k] : '—'}</span>
              <span className="mt-1 text-micro text-muted-foreground">{t(label)}</span>
            </div>
          ))}
        </div>
        {(p.top || p.bottom) && (
          <div className="mt-3 divide-y divide-border border-t border-border">
            {[[p.top, 'market.topGainer'], [p.bottom, 'market.topLoser']].filter(([s]) => s).map(([s, label]) => (
              <button key={label} onClick={() => open(s)} className="press flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-ui hover:bg-secondary/60">
                <span className="text-muted-foreground">{t(label)} · <b className="font-semibold text-foreground">{s.symbol}</b></span>
                <span className={`tabular ${pctCls(s.changePercent)}`}>{pct(s.changePercent)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Arama + sıralama çipleri */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('market.searchPlaceholder')}
            aria-label={t('market.searchPlaceholder')}
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-ui text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none md:w-72"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('common.clear')} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={cn('press h-9 shrink-0 rounded-full border px-3 text-ui',
                sort === s.key ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:border-foreground')}
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>

      <Section title="BIST 30" meta={`${sorted.length} / ${stocks.length}`}>
        {/* Mobil: satır listesi */}
        <ul className="divide-y divide-border md:hidden">
          {sorted.map((s) => (
            <li key={s.symbol}>
              <button onClick={() => open(s)} className="press flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-secondary/60">
                <span className="min-w-0">
                  <span className="block text-body font-semibold text-foreground">{s.symbol}</span>
                  <span className="block truncate text-ui text-foreground">{s.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tabular block text-ui font-semibold text-foreground">₺{num(s.price)}</span>
                  <span className={`tabular mt-0.5 inline-flex rounded px-1.5 py-0.5 text-micro ${s.changePercent >= 0 ? 'bg-up/12 text-up' : 'bg-down/12 text-down'}`}>
                    {pct(s.changePercent)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Masaüstü: tablo (eski Market.jsx'ten aynen) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-micro">
            <thead>
              <tr className="border-b border-border label text-muted-foreground">
                <th className="px-4 py-2.5 font-normal">{t('assets.symbol')}</th>
                <th className="px-4 py-2.5 font-normal">{t('market.company')}</th>
                <th className="px-4 py-2.5 text-right font-normal">{t('assets.price')}</th>
                <th className="px-4 py-2.5 text-right font-normal">{t('market.change')}</th>
                <th className="px-4 py-2.5 font-normal">{t('market.dayRange')}</th>
                <th className="px-4 py-2.5 text-right font-normal">{t('market.volume')}</th>
                <th className="px-4 py-2.5 font-normal">{t('market.band52')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((s) => {
                const band = bandPos(s)
                return (
                  <tr key={s.symbol} onClick={() => open(s)} className="group cursor-pointer hover:bg-secondary">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2 font-semibold text-foreground group-hover:underline">
                        <SymbolBadge symbol={s.symbol} />
                        {s.symbol}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-ui text-foreground">{s.name}</td>
                    <td className="tabular px-4 py-2.5 text-right text-foreground">{num(s.price)}</td>
                    <td className={`tabular px-4 py-2.5 text-right font-semibold ${pctCls(s.changePercent)}`}>{pct(s.changePercent)}</td>
                    <td className="px-4 py-2.5">
                      <RangeBar low={s.dayLow} high={s.dayHigh} value={s.price} />
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-muted-foreground">{compact(s.volume)}</td>
                    <td className="px-4 py-2.5">
                      {band != null && (
                        <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-border">
                          <span className={`block h-full rounded-full ${catOf('Gold').dot}`} style={{ width: `${band}%` }} />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-micro text-muted-foreground">{t('market.notInBist30')}</p>
            {wideSearching && <p className="mt-2 text-micro text-muted-foreground">{t('common.loading')}</p>}
            {wideResults.length > 0 && (
              <div className="mx-auto mt-4 max-w-sm space-y-1 text-left">
                <div className="label text-muted-foreground">{t('market.wideSearch')}</div>
                {wideResults.slice(0, 8).map((r) => (
                  <div key={`${r.symbol}-${r.exchange}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ui">
                    <SymbolBadge symbol={r.symbol} />
                    <span className="font-semibold text-foreground">{r.symbol}</span>
                    <span className="truncate text-muted-foreground">{r.name}</span>
                    <span className="tabular ml-auto text-micro text-muted-foreground">{r.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </div>
  )
}

function SymbolBadge({ symbol }) {
  const cat = catOf('Stock')
  return (
    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md font-mono text-micro ${cat.tint} ${cat.text}`}>
      {symbol.slice(0, 2)}
    </span>
  )
}
