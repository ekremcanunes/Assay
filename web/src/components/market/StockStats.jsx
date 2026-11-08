import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { num, pct, pctCls, compact, bandPos } from './marketFormat'

// Konum çubuğu: iz + konum işareti; fill verilirse işarete kadar dolu (52H konum).
export function Track({ pos, fill }) {
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

// Hisse istatistikleri: dönem getirisi, gün içi aralık, 52H konum, hacim — rakam + düz cümle.
// s: { price, dayHigh, dayLow, week52High, week52Low, volume }; candles: 1 yıllık seri; cur: para birimi işareti.
// Piyasa paneli (StockDetail) ve varlık sayfası aynı bloğu kullanır.
export function StockStats({ s, candles, volumeRank, cur = '₺' }) {
  const { t } = useLanguage()

  const hasDay = s.dayHigh != null && s.dayLow != null && s.dayHigh > s.dayLow
  const dayPos = hasDay ? Math.min(100, Math.max(0, ((s.price - s.dayLow) / (s.dayHigh - s.dayLow)) * 100)) : null
  const where = dayPos == null ? null : dayPos < 33 ? 'market.where.low' : dayPos > 67 ? 'market.where.high' : 'market.where.mid'

  const band = bandPos(s)
  const belowPeak = s.week52High ? ((s.week52High - s.price) / s.week52High) * 100 : null
  const aboveLow = s.week52Low ? ((s.price - s.week52Low) / s.week52Low) * 100 : null
  const returns = returnsOf(candles ?? [], s.price)

  return (
    <>
      {/* Kart içinde kart yok (BL-14): bloklar ince ayırıcıyla ayrılır */}
      {returns && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="label mb-2 text-muted-foreground">{t('market.returns')}</div>
          <div className="grid grid-cols-3 divide-x divide-border">
            {returns.map(([label, v]) => (
              <div key={label} className="px-2 text-center">
                <div className="text-micro text-muted-foreground">{t(label)}</div>
                <div className={cn('tabular mt-0.5 text-ui font-bold', pctCls(v))}>{pct(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4 border-t border-border pt-4">
        <div>
          <div className="mb-2 label text-muted-foreground">{t('market.dayRange')}</div>
          <Track pos={dayPos} />
          {hasDay && (
            <p className="mt-2 text-ui text-foreground">
              {t('market.dayRangeText')
                .replace('{low}', num(s.dayLow))
                .replace('{high}', num(s.dayHigh))
                .replace('{cur}', cur)
                .replace('{where}', t(where))}
            </p>
          )}
        </div>
        <div className="border-t border-border pt-4">
          <div className="mb-2 label text-muted-foreground">{t('market.band52')}</div>
          <Track pos={band} fill="bg-input" />
          {band != null && (
            <p className="mt-2 text-ui text-foreground">
              {belowPeak <= 0.5
                ? t('market.atPeak')
                : t('market.band52Text')
                  .replace('{low}', num(s.week52Low))
                  .replace('{high}', num(s.week52High))
                  .replace('{cur}', cur)
                  .replace('{below}', Math.round(belowPeak))
                  .replace('{above}', Math.round(aboveLow))}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
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
    </>
  )
}
