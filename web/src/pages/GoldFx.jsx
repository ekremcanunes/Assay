import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import AssetDrawer from '@/components/AssetDrawer'
import { Page } from '@/components/Page'
import { Section } from '@/components/Section'
import { Sparkline } from '@/components/Sparkline'
import { catOf } from '@/lib/assetColors'

const num = (v, d = 2) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v ?? 0)
const pct = (v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—')

// Sarrafiye ağırlıkları — gram fiyatından türetilir, ayrı veri kaynağı yok.
// Milyem: külçe dışındaki ürünler 22 ayar (0.916) ve gram karşılıkları standarttır.
const GOLD_UNITS = [
  { key: 'gram', labelKey: 'goldfx.gram', grams: 1, purity: 1 },
  { key: 'quarter', labelKey: 'goldfx.quarter', grams: 1.75, purity: 0.916 },
  { key: 'half', labelKey: 'goldfx.half', grams: 3.5, purity: 0.916 },
  { key: 'full', labelKey: 'goldfx.full', grams: 7.0, purity: 0.916 },
  { key: 'republic', labelKey: 'goldfx.republic', grams: 7.216, purity: 0.916 },
]

export default function GoldFx() {
  const { t } = useLanguage()
  const { data, isLoading } = useMarketOverview()
  const [drawer, setDrawer] = useState(null)

  const strip = data?.strip ?? []
  const gold = strip.find((q) => q.symbol === 'XAU')
  const fx = strip.filter((q) => q.symbol !== 'XAU')

  const open = (q) =>
    setDrawer({
      symbol: q.symbol,
      market: true,
      assetType: q.symbol === 'XAU' ? 'Gold' : 'Currency',
      nativeCurrency: 'TRY',
      nativePrice: q.price,
      previousClose: q.previousClose,
      priceAvailable: true,
    })

  if (isLoading) {
    return (
      <Page eyebrow={t('nav.sectionMarket')} title={t('nav.goldFx')}>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Page>
    )
  }

  return (
    <Page eyebrow={t('nav.sectionMarket')} title={t('nav.goldFx')} meta={t('goldfx.sourceNote')}>
      <div className="space-y-4">
        {/* Kartlar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {strip.map((q) => {
            const cat = catOf(q.symbol === 'XAU' ? 'Gold' : 'Currency')
            return (
              <button
                key={q.symbol}
                onClick={() => open(q)}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left hover:border-foreground"
              >
                <span className={`absolute inset-y-0 left-0 w-[3px] ${cat.dot}`} />
                <div className="label text-muted-foreground">{q.name || q.symbol}</div>
                <div className="tabular mt-1.5 text-figure font-semibold tracking-tight text-foreground">{num(q.price)} ₺</div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  {q.changePercent != null ? (
                    <span className={`tabular inline-flex rounded-full px-2 py-0.5 text-micro ${q.changePercent >= 0 ? 'bg-up/12 text-up' : 'bg-down/12 text-down'}`}>
                      {pct(q.changePercent)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Sparkline data={q.spark} className="h-7 w-20" />
                </div>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Sarrafiye — gram fiyatından hesaplanır */}
          <Section title={t('goldfx.units')} meta={t('goldfx.derivedNote')}>
            {gold ? (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-ui">
                <thead>
                  <tr className="border-b border-border label text-muted-foreground">
                    <th className="px-4 py-2.5 font-normal">{t('goldfx.unit')}</th>
                    <th className="px-4 py-2.5 text-right font-normal">{t('assets.grams')}</th>
                    <th className="px-4 py-2.5 text-right font-normal">{t('goldfx.approxValue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {GOLD_UNITS.map((u) => (
                    <tr key={u.key}>
                      <td className="px-4 py-2.5 text-foreground">{t(u.labelKey)}</td>
                      <td className="tabular px-4 py-2.5 text-right text-muted-foreground">{num(u.grams, 3)}</td>
                      <td className="tabular px-4 py-2.5 text-right font-semibold text-foreground">
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

          {/* 30 günlük değişim */}
          <Section title={t('goldfx.month')} meta={t('goldfx.monthNote')}>
            <div className="space-y-3 p-4">
              {strip.map((q) => {
                const s = q.spark ?? []
                const change = s.length > 1 ? ((s[s.length - 1] - s[0]) / s[0]) * 100 : null
                const cat = catOf(q.symbol === 'XAU' ? 'Gold' : 'Currency')
                return (
                  <div key={q.symbol} className="flex items-center gap-3 text-ui">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${cat.dot}`} />
                    <span className="w-24 shrink-0 text-foreground">{q.name || q.symbol}</span>
                    <Sparkline data={s} className="h-7 flex-1" />
                    <span className={`tabular w-16 text-right font-semibold ${change == null ? 'text-muted-foreground' : change >= 0 ? 'text-up' : 'text-down'}`}>
                      {pct(change)}
                    </span>
                  </div>
                )
              })}
              {fx.length === 0 && <p className="py-6 text-center text-micro text-muted-foreground">—</p>}
            </div>
          </Section>
        </div>
      </div>

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </Page>
  )
}
