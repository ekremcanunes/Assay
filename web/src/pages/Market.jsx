import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview, useSymbolSearch } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import AssetDrawer from '@/components/AssetDrawer'
import { Page } from '@/components/Page'
import { Section, StatCard } from '@/components/Section'
import { Sparkline, RangeBar } from '@/components/Sparkline'
import { catOf } from '@/lib/assetColors'
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
  { key: 'change', label: 'market.sortChange', fn: (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity) },
  { key: 'volume', label: 'market.sortVolume', fn: (a, b) => (b.volume ?? -1) - (a.volume ?? -1) },
  { key: 'symbol', label: 'assets.symbol', fn: (a, b) => a.symbol.localeCompare(b.symbol) },
]

export default function Market() {
  const { t } = useLanguage()
  const { data, isLoading } = useMarketOverview()
  const [drawer, setDrawer] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('change')

  const stocks = useMemo(() => data?.stocks ?? [], [data])
  const indices = data?.indices ?? []

  // BIST 30 içinde arama tamamen client-side: 30 satır, ağ turu gereksiz.
  const q = query.trim().toLocaleUpperCase('tr')
  const filtered = useMemo(
    () =>
      q.length === 0
        ? stocks
        : stocks.filter(
            (s) =>
              s.symbol.toLocaleUpperCase('tr').includes(q) ||
              (s.name ?? '').toLocaleUpperCase('tr').includes(q)
          ),
    [stocks, q]
  )

  const sorted = useMemo(
    () => [...filtered].sort(SORTS.find((s) => s.key === sort).fn),
    [filtered, sort]
  )

  // BIST 30 dışına taşan arama → tüm BIST evreni (Redis cache'li katalog)
  const wantsWideSearch = q.length >= 2 && filtered.length === 0
  const { data: wideResults = [], isFetching: wideSearching } = useSymbolSearch(wantsWideSearch ? query.trim() : null)

  // Piyasa nabzı — mevcut changePercent'ten sayım, ek veri yok
  const pulse = useMemo(() => {
    const rated = stocks.filter((s) => s.changePercent != null)
    const up = rated.filter((s) => s.changePercent > 0.05).length
    const down = rated.filter((s) => s.changePercent < -0.05).length
    const avg = rated.length ? rated.reduce((sum, s) => sum + s.changePercent, 0) / rated.length : null
    return { up, down, flat: rated.length - up - down, total: rated.length, avg }
  }, [stocks])

  const volumeLeaders = useMemo(
    () => [...stocks].filter((s) => s.volume != null).sort((a, b) => b.volume - a.volume).slice(0, 5),
    [stocks]
  )

  const nearHigh = useMemo(
    () =>
      stocks
        .map((s) => ({ ...s, band: bandPos(s) }))
        .filter((s) => s.band != null && s.band >= 90)
        .sort((a, b) => b.band - a.band)
        .slice(0, 5),
    [stocks]
  )

  const open = (s) =>
    setDrawer({
      symbol: s.symbol,
      market: true,
      assetType: 'Stock',
      exchange: 'BIST',
      nativeCurrency: 'TRY',
      nativePrice: s.price,
      previousClose: s.previousClose,
      dayHigh: s.dayHigh,
      dayLow: s.dayLow,
      week52High: s.week52High,
      week52Low: s.week52Low,
      priceAvailable: true,
    })

  if (isLoading) {
    return (
      <Page eyebrow={t('nav.sectionMarket')} title={t('nav.market')}>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </Page>
    )
  }

  return (
    <Page
      eyebrow={t('nav.sectionMarket')}
      title={t('nav.market')}
      meta={t('market.delayNote')}
    >
      <div className="space-y-4">
        {/* Endeksler + özet */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {indices.map((idx) => (
            <div key={idx.symbol} className="relative overflow-hidden rounded-xl border border-border bg-card px-3.5 py-3">
              <span className={`absolute inset-y-0 left-0 w-[3px] ${catOf('Index').dot}`} />
              <div className="label text-muted-foreground">{idx.name}</div>
              <div className="tabular mt-1 text-figure font-semibold tracking-tight text-foreground">{num(idx.price)}</div>
              <span className={`tabular mt-1.5 inline-flex rounded-full px-2 py-0.5 text-micro ${idx.changePercent >= 0 ? 'bg-up/12 text-up' : 'bg-down/12 text-down'}`}>
                {pct(idx.changePercent)}
              </span>
              <div className="absolute bottom-2.5 right-2.5">
                <Sparkline data={idx.spark} />
              </div>
            </div>
          ))}

          <StatCard
            accent={pulse.avg >= 0 ? 'bg-up' : 'bg-down'}
            label={t('market.avgChange')}
            value={pct(pulse.avg)}
            chip={<span className="mt-1.5 inline-flex text-micro text-muted-foreground">{pulse.total} {t('market.stockCount')}</span>}
          />
          <StatCard
            accent={catOf('Gold').dot}
            label={t('market.nearHigh')}
            value={`${nearHigh.length}`}
            chip={<span className="mt-1.5 inline-flex text-micro text-muted-foreground">{t('market.nearHighNote')}</span>}
          />
        </div>

        {/* Piyasa nabzı */}
        <Section title={t('market.pulse')} meta={`BIST 30 · ${pulse.total}`}>
          <div className="p-4">
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              <span className="bg-up" style={{ width: `${(pulse.up / (pulse.total || 1)) * 100}%` }} />
              <span className="bg-border" style={{ width: `${(pulse.flat / (pulse.total || 1)) * 100}%` }} />
              <span className="bg-down" style={{ width: `${(pulse.down / (pulse.total || 1)) * 100}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-ui text-foreground">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-up" />{t('market.rising')} <b className="tabular">{pulse.up}</b></span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-border" />{t('market.flat')} <b className="tabular">{pulse.flat}</b></span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-down" />{t('market.falling')} <b className="tabular">{pulse.down}</b></span>
            </div>
          </div>
        </Section>

        {/* Hacim liderleri + 52H zirvesine yakın */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Section title={t('market.volumeLeaders')} meta={t('market.volumeUnit')}>
            <div className="p-2">
              {volumeLeaders.map((s) => (
                <button key={s.symbol} onClick={() => open(s)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-ui hover:bg-secondary">
                  <SymbolBadge symbol={s.symbol} />
                  <span className="font-semibold text-foreground">{s.symbol}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span className={`block h-full rounded-full ${catOf('Stock').dot}`} style={{ width: `${(s.volume / volumeLeaders[0].volume) * 100}%` }} />
                  </span>
                  <span className="tabular w-16 text-right text-muted-foreground">{compact(s.volume)}</span>
                </button>
              ))}
              {volumeLeaders.length === 0 && <p className="py-6 text-center text-micro text-muted-foreground">—</p>}
            </div>
          </Section>

          <Section title={t('market.nearHigh')} meta={t('market.nearHighNote')}>
            <div className="p-2">
              {nearHigh.map((s) => (
                <button key={s.symbol} onClick={() => open(s)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-ui hover:bg-secondary">
                  <SymbolBadge symbol={s.symbol} />
                  <span className="font-semibold text-foreground">{s.symbol}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span className={`block h-full rounded-full ${catOf('Gold').dot}`} style={{ width: `${s.band}%` }} />
                  </span>
                  <span className="tabular w-14 text-right text-muted-foreground">%{s.band.toFixed(0)}</span>
                </button>
              ))}
              {nearHigh.length === 0 && <p className="py-6 text-center text-micro text-muted-foreground">{t('market.noneNearHigh')}</p>}
            </div>
          </Section>
        </div>

        {/* BIST 30 tablosu */}
        <Section
          title="BIST 30"
          meta={`${sorted.length} / ${stocks.length}`}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex gap-1">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={`rounded-md px-2 py-1 text-micro ${sort === s.key ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t(s.label)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('market.searchPlaceholder')}
                  aria-label={t('market.searchPlaceholder')}
                  className="w-52 rounded-lg border border-border bg-background py-1.5 pl-8 pr-7 text-ui text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label={t('common.clear')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="overflow-x-auto">
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
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-muted-foreground">{s.name}</td>
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
          </div>
        </Section>
      </div>

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </Page>
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
