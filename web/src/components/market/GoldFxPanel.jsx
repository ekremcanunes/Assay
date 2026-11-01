import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import AssetDrawer from '@/components/AssetDrawer'
import { AreaSpark } from '@/components/AreaSpark'
import { Section } from '@/components/Section'
import { num, pct, pctCls } from './marketFormat'

// Sarrafiye ağırlıkları — gram fiyatından türetilir, ayrı veri kaynağı yok.
// Milyem: külçe dışındaki ürünler 22 ayar (0.916) ve gram karşılıkları standarttır.
const GOLD_UNITS = [
  { key: 'gram', labelKey: 'goldfx.gram', grams: 1, purity: 1 },
  { key: 'quarter', labelKey: 'goldfx.quarter', grams: 1.75, purity: 0.916 },
  { key: 'half', labelKey: 'goldfx.half', grams: 3.5, purity: 0.916 },
  { key: 'full', labelKey: 'goldfx.full', grams: 7.0, purity: 0.916 },
  { key: 'republic', labelKey: 'goldfx.republic', grams: 7.216, purity: 0.916 },
]

// 30 gün grafiğinde seri renkleri: altın hep altın rengi, kurlar sırayla — yalnız ayırt eder
const FX_COLORS = ['--cat-stock', '--cat-cash', '--cat-index', '--cat-fx']
const seriesColor = (q, i) => `hsl(var(${q.symbol === 'XAU' ? '--cat-gold' : FX_COLORS[i % FX_COLORS.length]}))`

// 30 günlük değişim: her seri kendi ilk değerine göre % — tek grafikte karşılaştırılabilir
function MonthChart({ strip }) {
  const series = strip
    .map((q, i) => {
      const s = q.spark ?? []
      if (s.length < 2 || !s[0]) return null
      return { q, color: seriesColor(q, i), pts: s.map((v) => ((v - s[0]) / s[0]) * 100) }
    })
    .filter(Boolean)
  if (series.length === 0) return <p className="py-8 text-center text-micro text-muted-foreground">—</p>

  const all = series.flatMap((x) => x.pts)
  const lo = Math.min(0, ...all)
  const hi = Math.max(0, ...all)
  const y = (v) => 46 - ((v - lo) / (hi - lo || 1)) * 42
  const path = (pts) => pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 100).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')

  return (
    <div className="p-4 pt-1">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {series.map(({ q, color, pts }) => {
          const last = pts[pts.length - 1]
          return (
            <span key={q.symbol} className="chip-neutral inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-micro">
              <i className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-foreground">{q.name || q.symbol}</span>
              <span className={`tabular font-semibold ${pctCls(last)}`}>{pct(last)}</span>
            </span>
          )
        })}
      </div>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-40 w-full" aria-hidden="true">
        <line x1="0" x2="100" y1={y(0)} y2={y(0)} stroke="hsl(var(--border))" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        {series.map(({ q, color, pts }) => (
          <path key={q.symbol} d={path(pts)} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}

// Altın & Döviz bölümü: kur kutuları (mini grafikli) + sarrafiye + 30 günlük değişim
export default function GoldFxPanel({ strip }) {
  const { t } = useLanguage()
  const [drawer, setDrawer] = useState(null)
  const gold = strip.find((q) => q.symbol === 'XAU')

  const open = (q) =>
    setDrawer({
      symbol: q.symbol,
      market: '',
      isMarketQuote: true,
      assetType: q.symbol === 'XAU' ? 'Gold' : 'Currency',
      nativeCurrency: 'TRY',
      nativePrice: q.price,
      previousClose: q.previousClose,
      priceAvailable: true,
    })

  return (
    <div className="space-y-4">
      <div>
        <div className="label mb-2 text-muted-foreground">{t('goldfx.rates')}</div>
        {/* Mobilde 2×2 — dört kur ilk ekrana sığar */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {strip.map((q) => {
            const up = (q.changePercent ?? 0) >= 0
            return (
              <button
                key={q.symbol}
                onClick={() => open(q)}
                className="press flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-card hover:border-input"
              >
                <span className="flex items-start justify-between gap-2 px-3.5 pt-3.5">
                  <span className="label truncate text-muted-foreground">{q.name || q.symbol}</span>
                  {q.changePercent != null && (
                    <span className={`tabular shrink-0 rounded-sm px-1.5 py-0.5 text-micro font-semibold ${up ? 'chip-up' : 'chip-down'}`}>
                      {pct(q.changePercent)}
                    </span>
                  )}
                </span>
                <span className="tabular truncate px-3.5 pt-1 text-figure font-bold text-foreground">{num(q.price)} ₺</span>
                <AreaSpark values={q.spark ?? []} color={`hsl(var(${up ? '--up' : '--down'}))`} className="mt-2 h-10 w-full" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Sarrafiye — gram fiyatından hesaplanır */}
        <Section title={t('goldfx.units')} meta={t('goldfx.derivedNote')}>
          {gold ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-ui">
                <thead>
                  <tr className="label border-y border-border bg-secondary/40 text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">{t('goldfx.unit')}</th>
                    <th className="px-4 py-2.5 text-right font-semibold">{t('assets.grams')}</th>
                    <th className="px-4 py-2.5 text-right font-semibold">{t('goldfx.approxValue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {GOLD_UNITS.map((u) => (
                    <tr key={u.key}>
                      <td className="px-4 py-3 text-foreground">{t(u.labelKey)}</td>
                      <td className="tabular px-4 py-3 text-right text-muted-foreground">{num(u.grams, 3)}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold text-foreground">
                        {num(gold.price * u.grams * u.purity)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-micro text-muted-foreground">—</p>
          )}
        </Section>

        <Section title={t('goldfx.month')} meta={t('goldfx.monthNote')}>
          <MonthChart strip={strip} />
        </Section>
      </div>

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </div>
  )
}
