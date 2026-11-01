import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAssetTransactions } from '@/hooks/queries'
import PriceChart from './PriceChart'
import { buyPath } from '@/lib/portfolioCategories'
import { ArrowDownRight, Plus, TrendingUp, TrendingDown, Maximize2, Minimize2, X } from 'lucide-react'

const fmt = (v, currency) =>
  v != null
    ? new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', { style: 'currency', currency }).format(v)
    : '—'
const fmtNum = (v) => (v != null ? new Intl.NumberFormat('tr-TR').format(v) : '—')

function Row({ label, value, valueClass = 'text-foreground' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular text-right font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

// Varlık türüne göre etiket + TradingView sembolü
function typeConfig(holding, t) {
  switch (holding.assetType) {
    case 'Currency':
      return { qtyLabel: t('assets.amount'), avgLabel: t('assets.buyRate'), priceLabel: t('assets.currentRate') }
    case 'Gold':
      return { qtyLabel: t('assets.grams'), avgLabel: t('assets.avgCost'), priceLabel: t('assets.pricePerGram') }
    default:
      return { qtyLabel: t('assets.quantity'), avgLabel: t('assets.avgCost'), priceLabel: t('assets.currentPrice') }
  }
}

export default function AssetDrawer({ holding, onClose, onSell }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const isMarket = !!holding?.isMarketQuote // piyasa modu: sahip olunmayan, sadece izlenen sembol
  const { data: lots = [], isLoading: lotsLoading } = useAssetTransactions(holding?.market, isMarket ? null : holding?.symbol)
  const [expanded, setExpanded] = useState(false)

  const panelRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Panel açıkken arkadaki sayfa kaymaz; odak panele geçer (klavye ve ekran okuyucu panelde başlar)
  useEffect(() => {
    if (!holding) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { root.style.overflow = prev }
  }, [holding])
  useEffect(() => { panelRef.current?.focus() }, [holding, expanded])

  if (!holding) return null

  const cfg = typeConfig(holding, t)
  const native = holding.nativeCurrency || holding.currency
  const price = holding.nativePrice
  const prev = holding.previousClose
  const change = price != null && prev != null ? price - prev : null
  const changePct = change != null && prev ? (change / prev) * 100 : null
  const up = change != null && change >= 0
  const hasMarketStats = holding.dayHigh != null || holding.week52High != null
  const pl = holding.unrealizedProfitLoss
  const plUp = pl != null && pl >= 0

  // --- İçerik blokları (iki layout da bunları kullanır) ---
  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-head font-bold text-foreground">{holding.symbol}</span>
          <span className="label shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-primary">{holding.exchange || holding.assetType}</span>
        </div>
        {holding.name && holding.name !== holding.symbol && <div className="mt-0.5 truncate text-body text-foreground">{holding.name}</div>}
      </div>
      <div className="-mr-2 flex shrink-0 items-center">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="hidden h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:grid"
          aria-label={expanded ? t('drawer.collapse') : t('drawer.expand')}
          title={expanded ? t('drawer.collapse') : t('drawer.expand')}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button onClick={onClose} aria-label={t('common.cancel')} className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  const priceBlock = (
    <div className="border-b border-border pb-4">
      {holding.priceAvailable ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="label text-muted-foreground">{cfg.priceLabel}</div>
            <div className="tabular mt-1 text-title font-bold text-foreground">{fmt(price, native)}</div>
          </div>
          {change != null && (
            <span className={`tabular mb-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-ui font-semibold ${up ? 'chip-up' : 'chip-down'}`}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {fmt(change, native)} ({changePct >= 0 ? '+' : ''}{changePct?.toFixed(2)}%)
            </span>
          )}
        </div>
      ) : (
        <div className="text-down">{t('assets.priceUnavailable')}</div>
      )}
    </div>
  )

  const statsBlock = holding.priceAvailable && hasMarketStats && (
    <div className="pt-5">
      <h3 className="mb-2 label text-muted-foreground">{t('drawer.marketStats')}</h3>
      <div className="divide-y divide-border rounded-xl border border-border bg-secondary/40 px-4">
      <Row label={t('drawer.previousClose')} value={fmt(prev, native)} />
      <Row label={t('drawer.dayRange')} value={`${fmt(holding.dayLow, native)} – ${fmt(holding.dayHigh, native)}`} />
      <Row label={t('drawer.week52Range')} value={`${fmt(holding.week52Low, native)} – ${fmt(holding.week52High, native)}`} />
      <Row label={t('drawer.volume')} value={fmtNum(holding.volume)} />
      </div>
    </div>
  )

  const positionBlock = (
    <div className="pt-5">
      <h3 className="mb-2 label text-muted-foreground">{t('drawer.yourPosition')}</h3>
      <div className="divide-y divide-border rounded-xl border border-border bg-secondary/40 px-4">
      <Row label={cfg.qtyLabel} value={fmtNum(holding.quantity)} />
      <Row label={cfg.avgLabel} value={fmt(holding.avgCostBasis, holding.currency)} />
      <Row label={t('assets.currentValue')} value={fmt(holding.valueInTry, 'TRY')} />
      <Row
        label={t('assets.profitLoss')}
        valueClass={pl == null ? 'text-muted-foreground' : plUp ? 'text-up' : 'text-down'}
        value={pl != null
          ? `${fmt(pl, holding.currency)}${holding.unrealizedProfitLossPercent != null ? ` (${holding.unrealizedProfitLossPercent >= 0 ? '+' : ''}${holding.unrealizedProfitLossPercent.toFixed(2)}%)` : ''}`
          : '—'}
      />
      </div>
    </div>
  )

  const lotBlock = (
    <div className="pt-5">
      <h3 className="mb-2 label text-muted-foreground">{t('drawer.lotHistory')}</h3>
      {lotsLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : lots.length === 0 ? (
        <p className="text-muted-foreground">{t('drawer.noHistory')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border px-4">
        <table className="tabular w-full text-left">
          <thead>
            <tr className="border-b border-border label text-muted-foreground">
              <th className="py-2.5 font-normal">{t('drawer.date')}</th>
              <th className="py-2.5 font-normal">{t('common.type')}</th>
              <th className="py-2.5 text-right font-normal">{cfg.qtyLabel}</th>
              <th className="py-2.5 text-right font-normal">{cfg.avgLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td className="py-2.5">{new Date(lot.date).toLocaleDateString('tr-TR')}</td>
                <td className={`py-2.5 font-semibold ${lot.type === 'AssetSell' ? 'text-down' : 'text-up'}`}>
                  {lot.type === 'AssetSell' ? t('assets.sell') : t('assets.buy')}
                </td>
                <td className="py-2.5 text-right">{fmtNum(lot.quantity)}</td>
                <td className="py-2.5 text-right">{fmt(lot.unitPrice, lot.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )

  const actionBtn = isMarket ? (
    <button
      onClick={() => navigate(buyPath({ type: holding.assetType, symbol: holding.symbol, market: holding.market, name: holding.name }))}
      className="press flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-body font-semibold text-primary-foreground hover:opacity-90"
    >
      <Plus className="h-4 w-4" />
      {t('assets.buy')}
    </button>
  ) : (
    <button
      onClick={() => onSell(holding)}
      className="press flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-body font-semibold text-foreground hover:bg-secondary"
    >
      <ArrowDownRight className="h-4 w-4" />
      {t('assets.sell')}
    </button>
  )

  // Grafik — mode değişince yeniden boyutlansın diye key veriyoruz
  const chart = (
    <PriceChart
      market={holding.market}
      symbol={holding.symbol}
      assetType={holding.assetType}
      exchange={holding.exchange}
      height={expanded ? 460 : 300}
      key={expanded ? 'expanded' : 'collapsed'}
    />
  )

  // Panel her zaman sayfa köküne çizilir (portal): atası transform/animasyon taşısa bile
  // `fixed` ekrana göre konumlanır (aksi halde detay sayfalarında liste kutusuna hapsoluyordu).
  // --- GENİŞLETİLMİŞ: tam ekran, iki kolon (bilgi sol, büyük grafik sağ) ---
  if (expanded) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-veil p-4 md:p-8" onClick={onClose}>
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className="modal-in mx-auto flex h-full max-w-6xl flex-col rounded-2xl border border-border bg-popover shadow-float outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-6 py-5 text-ui">{header}</div>
          <div className="grid flex-1 grid-cols-1 overflow-y-auto overscroll-contain md:grid-cols-[360px_1fr] md:overflow-hidden">
            <div className="border-border p-6 text-ui md:overflow-y-auto md:border-r">
              {priceBlock}
              {statsBlock}
              {!isMarket && positionBlock}
              {!isMarket && lotBlock}
              <div className="pt-6">{actionBtn}</div>
            </div>
            <div className="min-h-96 p-6 md:min-h-0">
              <div className="h-full min-h-96 overflow-hidden rounded-xl border border-border md:min-h-0">{chart}</div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // --- KATLANMIŞ: mobilde alttan sheet, md+ sağ panel ---
  return createPortal(
    <div className="fixed inset-0 z-40 bg-veil backdrop-blur-[1px]" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="modal-in fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col justify-between overflow-y-auto overscroll-contain rounded-t-sheet border-t border-border bg-popover px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 text-ui shadow-sheet outline-none md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-l md:border-t-0 md:pb-6 md:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-input md:hidden" aria-hidden="true" />
          {header}
          <div className="mt-5">{priceBlock}</div>
          {statsBlock}
          {!isMarket && positionBlock}
          {!isMarket && lotBlock}
          <div className="pt-5">
            <h3 className="mb-2 label text-muted-foreground">{t('drawer.chart')}</h3>
            <div className="h-72 overflow-hidden rounded-xl border border-border">{chart}</div>
          </div>
        </div>
        <div className="pt-6">{actionBtn}</div>
      </div>
    </div>,
    document.body
  )
}
