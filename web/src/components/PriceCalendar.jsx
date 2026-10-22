import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory, usePriceOnDate } from '@/hooks/queries'
import { toDateString, fromDateString, formatDisplayDate } from '@/lib/date'
import { heatTier, shortPrice, closesByDay, monthsBack, nearestClose } from '@/lib/heat'
import { catOf } from '@/lib/assetColors'
import { cn } from '@/lib/utils'

// Kategori rengi kart zeminiyle karıştırılır: %10 → %100 (voltaj değil — DESIGN.md doz kuralı)
const MIX = [10, 28, 48, 72, 100]
const heatStyle = (hex, tier) =>
  tier == null ? undefined : { background: `color-mix(in oklab, ${hex} ${MIX[tier]}%, hsl(var(--card)))`, color: tier >= 3 ? '#fff' : undefined }

const YEARS_BACK = 20

/*
  Tam ekran fiyatlı takvim (masaüstünde ortada pencere). Aylar dikey, en yeni üstte;
  son 1 yıl varlığın kategori renginde ısı + kısa fiyat. Daha eskisi yıl düğmeleriyle,
  renksiz. Açma/kapama sahibinin işi (AddAsset geri tuşu için URL'e bağlar).
*/
export default function PriceCalendar({ open, ...props }) {
  // Yalnızca açıkken çizilir; her açılış seçimi formdaki tarihten başlatır
  return open ? <CalendarSheet {...props} /> : null
}

function CalendarSheet({ market = '', symbol, assetType, label, value, onClose, onSelect }) {
  const { t, lang } = useLanguage()
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'
  const today = useMemo(() => new Date(), [])
  const todayStr = toDateString(today)
  const yearAgo = toDateString(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))

  const { data: history } = usePriceHistory(market, symbol, assetType, '1y')
  const closes = useMemo(() => closesByDay(history?.candles), [history])
  const hasSeries = closes.size > 0
  const hex = catOf(assetType).hex

  const [picked, setPicked] = useState(value)
  // null = son 1 yıl görünümü; formdaki tarih 1 yıldan eskiyse o yılın görünümüyle açılır
  const [year, setYear] = useState(() => (value < yearAgo ? fromDateString(value).getFullYear() : null))
  const scrollRef = useRef(null)
  const headRef = useRef(null)

  // Seçili günün ayına kaydır (başlık yapışkan olduğu için onun yüksekliği kadar yukarı)
  useLayoutEffect(() => {
    const box = scrollRef.current
    const el = box?.querySelector(`[data-month="${value.slice(0, 7)}"]`)
    if (box && el) box.scrollTop = el.offsetTop - (headRef.current?.offsetHeight ?? 0)
  }, [value, year])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); root.style.overflow = prev }
  }, [onClose])

  // 1 yıldan eski seçimde fiyat seriden gelmez; tek gün sorgusu (formun da kullandığı, cache'li)
  const older = picked < yearAgo
  const { data: olderRef } = usePriceOnDate(market, older ? symbol : null, assetType, picked)

  const ccy = history?.currency ?? 'TRY'
  const money = (v) => (v == null ? '—' : new Intl.NumberFormat(locale, { style: 'currency', currency: ccy }).format(v))
  const near = !older && hasSeries ? nearestClose(closes, picked) : null
  const pickedPrice = older
    ? (olderRef?.available ? (ccy === 'USD' ? olderRef.priceInUsd : olderRef.priceInTry) : null)
    : near?.value ?? null
  const nowPrice = hasSeries ? [...closes.values()].at(-1) : null
  const diff = pickedPrice != null && nowPrice != null && picked !== todayStr ? ((nowPrice - pickedPrice) / pickedPrice) * 100 : null

  const months = year == null
    ? monthsBack(today, 13)
    : Array.from({ length: 12 }, (_, i) => ({ year, month: 11 - i }))
  const years = Array.from({ length: YEARS_BACK }, (_, i) => today.getFullYear() - 1 - i)
  const weekdays = lang === 'tr' ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return createPortal(
    <div className="fixed inset-0 z-50 md:grid md:place-items-center md:bg-foreground/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('cal.title')}
        onClick={(e) => e.stopPropagation()}
        className="modal-in flex h-full w-full flex-col bg-background md:h-[min(640px,90dvh)] md:w-[420px] md:overflow-hidden md:rounded-lg md:border md:border-border"
      >
        <div className="flex items-center gap-2 border-b border-border bg-card px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:pt-2">
          <button onClick={onClose} aria-label={t('cal.close')} className="press grid h-11 w-11 place-items-center rounded-md text-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="text-body font-semibold text-foreground">{t('cal.title')}</div>
            {symbol && (
              <div className="truncate text-micro text-muted-foreground">
                {label || symbol} · {t('cal.lastYear')}{history?.currency ? ` · ${history.currency}` : ''}
              </div>
            )}
          </div>
        </div>

        {hasSeries && year == null && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-micro text-muted-foreground">
            <span>{t('cal.cheap')}</span>
            <span className="flex gap-0.5">{MIX.map((_, i) => <i key={i} className="h-2 w-4 rounded-sm" style={heatStyle(hex, i)} />)}</span>
            <span>{t('cal.expensive')}</span>
            <span className="ml-auto">{t('cal.inMonth')}</span>
          </div>
        )}

        <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain">
          <div ref={headRef} className="sticky top-0 z-10 grid grid-cols-7 border-b border-border bg-background px-3 py-2">
            {weekdays.map((d) => <span key={d} className="text-center text-micro font-semibold uppercase tracking-wider text-muted-foreground">{d}</span>)}
          </div>

          {months.map(({ year: y, month }) => {
            const key = `${y}-${String(month + 1).padStart(2, '0')}`
            const days = new Date(y, month + 1, 0).getDate()
            const lead = (new Date(y, month, 1).getDay() + 6) % 7
            const monthVals = []
            for (let d = 1; d <= days; d++) {
              const v = closes.get(`${key}-${String(d).padStart(2, '0')}`)
              if (v != null) monthVals.push(v)
            }
            const colored = monthVals.length > 0
            return (
              <section key={key} data-month={key} className="px-3 pb-1.5 pt-3.5">
                <h3 className="px-1 pb-2.5 text-body font-semibold text-foreground">
                  {new Date(y, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                  {year != null && <span className="text-micro font-normal text-muted-foreground"> · {t('cal.noColor')}</span>}
                </h3>
                <div className="grid grid-cols-7 gap-[3px]">
                  {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
                  {Array.from({ length: days }, (_, i) => {
                    const ds = `${key}-${String(i + 1).padStart(2, '0')}`
                    const future = ds > todayStr
                    const inRange = ds >= yearAgo
                    const v = inRange ? closes.get(ds) : undefined
                    const tier = v != null ? heatTier(v, monthVals) : null
                    // Renkli ayda fiyatsız gün = piyasa kapalı (soluk); seri yoksa / eski tarihse düz zemin
                    const closed = v == null && inRange && colored
                    return (
                      <button
                        key={ds}
                        type="button"
                        disabled={future}
                        onClick={() => setPicked(ds)}
                        style={heatStyle(hex, tier)}
                        aria-label={`${formatDisplayDate(ds, lang)}${v != null ? ` ${money(v)}` : ''}`}
                        aria-pressed={picked === ds}
                        className={cn(
                          'flex aspect-[1/1.08] min-w-0 flex-col items-center justify-between rounded-md pb-1 pt-1.5 text-foreground transition-colors disabled:opacity-30',
                          v == null && !closed && !future && 'bg-secondary',
                          picked === ds && 'outline outline-2 outline-offset-1 outline-foreground'
                        )}
                      >
                        <span className={cn('text-ui font-medium', closed && 'text-muted-foreground opacity-60', ds === todayStr && (tier >= 3 ? 'font-bold underline underline-offset-2' : 'font-bold text-voltage'))}>
                          {i + 1}
                        </span>
                        <span className="tabular min-h-[11px] text-[9.5px] leading-none tracking-tight opacity-90">{v != null ? shortPrice(v) : ''}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {/* Daha eski: yıl düğmeleri; seçilen yılın ayları renksiz ve fiyatsız açılır */}
          <div className="mt-2.5 space-y-2.5 border-t border-border px-4 pb-6 pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="label text-muted-foreground">{t('cal.older')}</span>
              <span className="text-right text-micro text-muted-foreground">{t('cal.olderNote')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {year != null && (
                <button type="button" onClick={() => setYear(null)} className="press h-9 rounded-md border border-border bg-card px-2.5 text-ui text-foreground hover:border-foreground">
                  {t('cal.lastYearBtn')}
                </button>
              )}
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  aria-pressed={y === year}
                  onClick={() => { setYear(y); scrollRef.current?.scrollTo({ top: 0 }) }}
                  className={cn('press tabular h-9 min-w-[60px] rounded-md border px-2.5 text-ui',
                    y === year ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:border-foreground')}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border bg-card px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3 md:pb-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="label text-muted-foreground">{t('cal.selected')}</span>
            <span className="text-micro text-muted-foreground">{formatDisplayDate(picked, lang)}</span>
          </div>
          {symbol && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="tabular text-figure font-semibold text-foreground">{money(pickedPrice)}</span>
              {nowPrice != null && (
                <span className="text-micro text-muted-foreground">
                  {t('cal.today')} <span className="tabular text-foreground">{money(nowPrice)}</span>
                  {diff != null && <>{' · '}<span className={cn('tabular', diff >= 0 ? 'text-up' : 'text-down')}>{diff >= 0 ? '+' : '−'}%{Math.abs(diff).toFixed(1).replace('.', ',')}</span></>}
                </span>
              )}
            </div>
          )}
          {near && near.date !== picked && (
            <p className="text-micro text-muted-foreground">
              {t('cal.closedNote').replace('{date}', fromDateString(near.date).toLocaleDateString(locale, { day: 'numeric', month: 'long' }))}
            </p>
          )}
          <button type="button" onClick={() => onSelect(picked)} className="press h-12 w-full rounded-md bg-foreground text-body font-semibold text-background hover:opacity-85">
            {t('cal.use')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
