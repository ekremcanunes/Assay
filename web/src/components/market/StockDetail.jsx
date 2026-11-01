import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory } from '@/hooks/queries'
import PriceChart from '@/components/PriceChart'
import { catOf } from '@/lib/assetColors'
import { buyPath } from '@/lib/portfolioCategories'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { num, pct, pctCls, compact, bandPos } from './marketFormat'

// Konum çubuğu: iz + konum işareti; fill verilirse işarete kadar dolu (52H konum).
function Track({ pos, fill }) {
  if (pos == null) return <div className="h-1.5 rounded-full bg-secondary" />
  return (
    <div className="relative h-1.5 rounded-full bg-secondary">
      {fill && <span className={cn('absolute inset-y-0 left-0 rounded-full', fill)} style={{ width: `${pos}%` }} />}
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
        style={{ left: `${pos}%` }}
      />
    </div>
  )
}

const DAY = 86400

// Son kapanışa göre dönem getirisi: günler önceki (veya en yakın önceki) kapanışla karşılaştırılır.
// 1 yıl = serinin ilk kapanışı (seri zaten 1 yıllık).
function returnsOf(candles, price) {
  if (!candles.length || price == null) return null
  const now = Date.now() / 1000
  const closeBefore = (days) => {
    const cut = now - days * DAY
    let c = null
    for (const k of candles) {
      if (k.time > cut) break
      c = k.close
    }
    return c
  }
  const r = (base) => (base ? ((price - base) / base) * 100 : null)
  return [
    ['market.ret1m', r(closeBefore(30))],
    ['market.ret3m', r(closeBefore(91))],
    ['market.ret1y', r(candles[0].close)],
  ]
}

// Masaüstü Piyasa: seçili BIST 30 hissesinin sağda sabit duran paneli.
// Hiç bilmeyen biri için: rakam + düz cümle. Yalnız mevcut veri (Yahoo quote + 1 yıllık seri).
export default function StockDetail({ stock: s, volumeRank }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: history } = usePriceHistory('BIST', s.symbol, 'Stock', '1y')
  const cat = catOf('Stock')
  const change = s.previousClose != null ? s.price - s.previousClose : null
  const up = (s.changePercent ?? 0) >= 0

  const hasDay = s.dayHigh != null && s.dayLow != null && s.dayHigh > s.dayLow
  const dayPos = hasDay ? Math.min(100, Math.max(0, ((s.price - s.dayLow) / (s.dayHigh - s.dayLow)) * 100)) : null
  const where = dayPos == null ? null : dayPos < 33 ? 'market.where.low' : dayPos > 67 ? 'market.where.high' : 'market.where.mid'

  const band = bandPos(s)
  const belowPeak = s.week52High ? ((s.week52High - s.price) / s.week52High) * 100 : null
  const aboveLow = s.week52Low ? ((s.price - s.week52Low) / s.week52Low) * 100 : null
  const returns = returnsOf(history?.candles ?? [], s.price)

  return (
    <aside className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ui font-bold', cat.tint, cat.text)}>
          {s.symbol.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-figure font-bold text-foreground">{s.symbol}</span>
            <span className="label rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">BIST</span>
          </div>
          <div className="truncate text-ui text-foreground">{s.name}</div>
        </div>
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

      {/* Dönem getirisi — 1 yıllık seriden */}
      {returns && (
        <div className="mt-4">
          <div className="label mb-2 text-muted-foreground">{t('market.returns')}</div>
          <div className="grid grid-cols-3 gap-2">
            {returns.map(([label, v]) => (
              <div key={label} className="rounded-lg border border-border p-2.5 text-center">
                <div className="text-micro text-muted-foreground">{t(label)}</div>
                <div className={cn('tabular mt-0.5 text-ui font-bold', pctCls(v))}>{pct(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-4 rounded-xl border border-border p-4">
        <div>
          <div className="mb-2 label text-muted-foreground">{t('market.dayRange')}</div>
          <Track pos={dayPos} />
          {hasDay && (
            <p className="mt-2 text-ui text-foreground">
              {t('market.dayRangeText')
                .replace('{low}', num(s.dayLow))
                .replace('{high}', num(s.dayHigh))
                .replace('{where}', t(where))}
            </p>
          )}
        </div>
        <div className="border-t border-border pt-4">
          <div className="mb-2 label text-muted-foreground">{t('market.band52')}</div>
          <Track pos={band} fill={catOf('Gold').dot} />
          {band != null && (
            <p className="mt-2 text-ui text-foreground">
              {belowPeak <= 0.5
                ? t('market.atPeak')
                : t('market.band52Text')
                  .replace('{low}', num(s.week52Low))
                  .replace('{high}', num(s.week52High))
                  .replace('{below}', Math.round(belowPeak))
                  .replace('{above}', Math.round(aboveLow))}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border p-4">
        <div className="label text-muted-foreground">{t('market.dailyVolume')}</div>
        <div className="tabular mt-1 text-figure font-bold text-foreground">
          {compact(s.volume)} <span className="text-ui font-medium text-muted-foreground">{t('market.volumeUnit')}</span>
        </div>
        {s.volume != null && volumeRank > 0 && (
          <p className="mt-1 text-ui text-foreground">
            {t('market.volumeText').replace('{vol}', compact(s.volume)).replace('{rank}', volumeRank)}
          </p>
        )}
      </div>

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
