import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, CandlestickSeries, AreaSeries, HistogramSeries } from 'lightweight-charts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { usePriceHistory } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink } from 'lucide-react'

const RANGES = ['1d', '1w', '1mo', '3mo', '1y', '5y']
const RANGE_LABEL = { '1d': '1G', '1w': '1H', '1mo': '1A', '3mo': '3A', '1y': '1Y', '5y': '5Y' }

// Token'ı CSS renk dizesine çevirir: "152 72% 28%" → "hsl(152 72% 28%)".
// alpha verilirse "hsl(152 72% 28% / 0.22)". Tek renk kaynağı index.css;
// grafikte ad-hoc renk yok (DESIGN.md §8).
const token = (name, alpha) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return 'transparent'
  return alpha == null ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`
}

// Yalnızca TradingView'de gerçekten bulunan semboller için dış bağlantı üretilir.
const tradingViewUrl = (symbol, assetType, exchange) => {
  if (assetType === 'Gold') return 'https://www.tradingview.com/chart/?symbol=TVC%3AGOLD'
  if (assetType === 'Currency') return `https://www.tradingview.com/chart/?symbol=FX_IDC%3A${symbol}TRY`
  if (exchange === 'BIST') return `https://www.tradingview.com/chart/?symbol=BIST%3A${symbol}`
  return null
}

export default function PriceChart({ market = '', symbol, assetType = 'Stock', exchange, height = 320 }) {
  const { t } = useLanguage()
  const { dark } = useTheme() // tema değişince grafik yeni token'larla yeniden kurulur
  const [range, setRange] = useState('1mo')
  const containerRef = useRef(null)
  const { data, isLoading, isError } = usePriceHistory(market, symbol, assetType, range)

  const candles = useMemo(() => data?.candles ?? [], [data])
  const tvUrl = tradingViewUrl(symbol, assetType, exchange)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: token('--muted-foreground'),
        fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim(),
        fontSize: 10,
        // Apache-2.0 NOTICE: ya bu logo kalacak ya da uygulamada kalıcı bir
        // tradingview.com bağlantısı bulunacak. "TradingView'de aç" bağlantısı
        // her sembolde görünmediği için logoyu bırakıyoruz.
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: token('--border') },
        horzLines: { color: token('--border') },
      },
      rightPriceScale: { borderColor: token('--border') },
      timeScale: {
        borderColor: token('--border'),
        timeVisible: range === '1d' || range === '1w',
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: token('--muted-foreground'), labelBackgroundColor: token('--foreground') },
        horzLine: { color: token('--muted-foreground'), labelBackgroundColor: token('--foreground') },
      },
      handleScale: { axisPressedMouseMove: false },
    })

    const up = token('--up')
    const down = token('--down')

    // Döviz serisinde OHLC dört alan da aynı (Frankfurter günlük kapanış verir) →
    // mum anlamsız olur, alan grafiği çizilir.
    if (assetType === 'Currency') {
      const area = chart.addSeries(AreaSeries, {
        lineColor: token('--cat-fx'),
        topColor: token('--cat-fx', 0.22),
        bottomColor: 'transparent',
        lineWidth: 2,
        priceLineVisible: false,
      })
      area.setData(candles.map((c) => ({ time: c.time, value: c.close })))
    } else {
      // Gövde %85 (göz yormasın, kobalt çizgiler öne çıksın); kenar ve fitil tam renk
      const series = chart.addSeries(CandlestickSeries, {
        upColor: token('--up', 0.85),
        downColor: token('--down', 0.85),
        borderUpColor: up,
        borderDownColor: down,
        wickUpColor: up,
        wickDownColor: down,
        priceLineVisible: false,
      })
      series.setData(
        candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
      )

      // Hacim — alt %20'ye sıkıştırılmış ayrı ölçek
      const withVolume = candles.filter((c) => c.volume != null)
      if (withVolume.length > 0) {
        const volume = chart.addSeries(HistogramSeries, { priceScaleId: '', priceLineVisible: false })
        volume.setData(
          withVolume.map((c) => ({
            time: c.time,
            value: c.volume,
            // Hacim arka planda kalır: mumlarla yarışmasın
            color: token(c.close >= c.open ? '--up' : '--down', 0.35),
          }))
        )
        volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      }
    }

    chart.timeScale().fitContent()

    const resize = () => chart.applyOptions({ width: containerRef.current?.clientWidth ?? 0 })
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.remove()
    }
  }, [candles, assetType, range, height, dark])

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {/* Segment oluğu: aktif dilim beyaz yüzey + hairline */}
        <div className="inline-flex rounded-[10px] bg-secondary p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`tabular rounded-lg border px-2.5 py-1 text-micro ${
                range === r
                  ? 'border-border bg-card font-bold text-foreground shadow-card'
                  : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        {tvUrl && (
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-micro text-muted-foreground hover:text-foreground"
          >
            {t('chart.openInTradingView')}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {isLoading ? (
        <Skeleton style={{ height }} className="w-full" />
      ) : isError || candles.length === 0 ? (
        <div className="flex items-center justify-center text-micro text-muted-foreground" style={{ height }}>
          {t('chart.noData')}
        </div>
      ) : (
        <div ref={containerRef} className="w-full" style={{ height }} />
      )}
    </div>
  )
}
