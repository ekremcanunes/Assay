import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { marketApi } from '@/services/api'
import { useBuyAsset, usePriceOnDate } from '@/hooks/queries'
import { todayString, toApiDate, formatDisplayDate } from '@/lib/date'
import { Page } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import PriceCalendar from '@/components/PriceCalendar'
import { deviationOf } from '@/lib/priceDeviation'
import { slugOf } from '@/lib/portfolioCategories'
import { catOf } from '@/lib/assetColors'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AlertTriangle, CalendarDays, Search, X } from 'lucide-react'

const assetTypes = ['Gold', 'Stock', 'Currency']
const currencySymbols = ['USD', 'EUR', 'GBP']
const currencies = ['TRY', 'USD']
const stockMarkets = ['BIST', 'US']

// Seçili/seçili değil hap düğmesi (tür, döviz, para birimi)
const pill = (on) => cn('press h-9 shrink-0 rounded-full border px-3.5 text-ui',
  on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:border-foreground')

export default function AddAsset() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [params, setParams] = useSearchParams()
  // Ön seçim (?type=&symbol=&market=&name=): bir varlığın içinden "Al" ile gelindiyse o varlık seçili açılır.
  // Hissenin kimliği (market, symbol): market'i geçersiz bir hisse ön seçilmez, kullanıcı aramadan seçer.
  const initType = assetTypes.includes(params.get('type')) ? params.get('type') : ''
  const initMarket = initType === 'Stock' && stockMarkets.includes(params.get('market')) ? params.get('market') : ''
  const initSymbol = initType === 'Gold' ? 'XAU'
    : initType === 'Currency' ? (currencySymbols.includes(params.get('symbol')) ? params.get('symbol') : '')
    : initType === 'Stock' && initMarket ? (params.get('symbol') ?? '') : ''
  const [assetType, setAssetType] = useState(initType)
  const [symbol, setSymbol] = useState(initSymbol)
  const [market, setMarket] = useState(initMarket)
  const [selectedName, setSelectedName] = useState(() => (initType === 'Gold' ? t('assets.gold') : initType === 'Stock' && initSymbol ? (params.get('name') ?? '') : ''))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [date, setDate] = useState(todayString())
  const [error, setError] = useState(null)
  const [priceSource, setPriceSource] = useState('auto')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const buyMutation = useBuyAsset()

  const { data: reference, isFetching: refFetching, isError: refError } = usePriceOnDate(market, symbol, assetType, date)

  // Takvim URL'de (?date=pick): telefonun geri tuşu yalnızca takvimi kapatır, formu değil
  const calOpen = params.get('date') === 'pick'
  const openCal = () => setParams((p) => { p.set('date', 'pick'); return p })
  // Sayfa doğrudan ?date=pick ile açıldıysa geri gitmek uygulamadan çıkarırdı → parametreyi sil
  const closeCal = () =>
    window.history.state?.idx > 0 ? navigate(-1) : setParams((p) => { p.delete('date'); return p }, { replace: true })

  const today = todayString()
  const { data: nowRef } = usePriceOnDate(market, date !== today ? symbol : null, assetType, today)
  const pickPrice = (v) => (currency === 'USD' ? v?.priceInUsd : v?.priceInTry)
  const thenPrice = reference?.available ? pickPrice(reference) : null
  const nowPrice = date === today ? thenPrice : nowRef?.available ? pickPrice(nowRef) : null
  const sinceThen = thenPrice != null && nowPrice != null && date !== today ? ((nowPrice - thenPrice) / thenPrice) * 100 : null
  const totalCost = quantity && unitPrice ? parseFloat(quantity) * parseFloat(unitPrice) : null
  const money = (v) => new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', { style: 'currency', currency }).format(v)
  const unitWord = assetType === 'Gold' ? t('buy.unitGram') : assetType === 'Stock' ? t('buy.unitPiece') : (symbol || '')

  const refPrice = reference?.available
    ? (currency === 'USD' ? reference.priceInUsd : reference.priceInTry)
    : null
  const { ratio, tier } = priceSource === 'manual'
    ? deviationOf(unitPrice, refPrice)
    : { ratio: null, tier: 'none' }
  const pct = ratio != null ? (ratio * 100).toFixed(1) : '0'

  // Tarih/sembol değişince fiyatı doldur — ama YALNIZCA kullanıcı elle
  // dokunmadıysa. Kullanıcının yazdığı veri kutsal; üstüne yazmıyoruz.
  useEffect(() => {
    if (priceSource !== 'auto') return
    if (!reference?.available) return

    const value = currency === 'USD' ? reference.priceInUsd : reference.priceInTry
    if (value != null) setUnitPrice(String(value.toFixed(2)))
  }, [reference, currency, priceSource])

  // Hisse araması — debounce (300ms, min 2 karakter). Seçim yapıldıysa arama durur.
  useEffect(() => {
    if (assetType !== 'Stock' || symbol) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const res = await marketApi.search(q)
        setResults(res.data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [query, assetType, symbol])

  const handleTypeChange = (val) => {
    setAssetType(val)
    setQuery('')
    setResults([])
    setSymbol(val === 'Gold' ? 'XAU' : '')
    setMarket('')
    setSelectedName(val === 'Gold' ? t('assets.gold') : '')
    // Altın ve döviz her zaman TL ile alınır → para birimi kilitli
    if (val === 'Gold' || val === 'Currency') setCurrency('TRY')
  }

  const handleSelectResult = (r) => {
    setSymbol(r.symbol)
    setMarket(r.market)
    setSelectedName(r.name)
    setResults([])
    if (r.currency === 'USD' || r.currency === 'TRY') setCurrency(r.currency)
  }

  const handleClearSymbol = () => {
    setSymbol('')
    setMarket('')
    setSelectedName('')
    setQuery('')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (tier === 'confirm' && !confirmOpen) { setConfirmOpen(true); return }
    setConfirmOpen(false)
    if (!assetType || !symbol || !quantity || !unitPrice) return
    setError(null)
    try {
      await buyMutation.mutateAsync({
        assetType,
        symbol,
        market,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        currency,
        date: toApiDate(date),
        // auto: fiyat sistemden doldu ve dokunulmadı; manual: kullanıcı yazdı/değiştirdi
        priceSource: priceSource === 'auto' ? 'Market' : 'Manual',
      })
      navigate(`/assets/${slugOf(assetType)}`)
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message)
    }
  }

  const canBuy = !buyMutation.isPending && assetType && symbol && quantity && unitPrice

  return (
    <Page
      eyebrow={t('assets.title')}
      title={t('assets.buyAsset')}
      // Geri = geldiği sayfa (Piyasa, kategori…); doğrudan açıldıysa Portföy
      back={{ label: t('common.back'), onClick: () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/assets')) }}
    >
      <form onSubmit={handleSubmit} className="max-w-md space-y-4 pb-24 md:pb-0">
        {error && (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-ui text-destructive">{error}</div>
        )}

        {/* Tür — açılır menü yerine üç düğme: tek dokunuş, seçim hep görünür */}
        <div className="space-y-1.5">
          <Label>{t('common.type')}</Label>
          <div role="radiogroup" aria-label={t('common.type')} className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-secondary p-[3px]">
            {assetTypes.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={assetType === type}
                onClick={() => handleTypeChange(type)}
                className={cn('press flex h-10 items-center justify-center gap-1.5 rounded-md text-ui font-semibold',
                  assetType === type ? 'bg-card text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}
              >
                <i className={cn('h-2 w-2 rounded-sm', catOf(type).dot)} />
                {t(`assets.${type.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Varlık / sembol — tür seçilince */}
        {assetType && (
          <div className="space-y-1.5">
            <Label>{t(`assets.${assetType.toLowerCase()}`)}</Label>

            {assetType === 'Currency' && (
              <div className="flex gap-1.5">
                {currencySymbols.map((s) => (
                  <button key={s} type="button" aria-pressed={symbol === s} onClick={() => setSymbol(s)} className={pill(symbol === s)}>{s}</button>
                ))}
              </div>
            )}

            {assetType === 'Stock' && symbol && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <div className="text-ui font-semibold text-foreground">{symbol}</div>
                  <div className="truncate text-ui text-foreground">{selectedName}</div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={handleClearSymbol} aria-label={t('common.clear')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {assetType === 'Stock' && !symbol && (
              <div className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('assets.searchPlaceholder')}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {(searching || results.length > 0) && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-input bg-popover">
                    {searching && (
                      <div className="px-3 py-2 text-ui text-muted-foreground">{t('common.loading')}</div>
                    )}
                    {!searching && results.map((r) => (
                      <button
                        key={`${r.market}-${r.symbol}`}
                        type="button"
                        onClick={() => handleSelectResult(r)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary"
                      >
                        <div className="min-w-0">
                          <div className="text-ui font-semibold text-foreground">{r.symbol}</div>
                          <div className="truncate text-ui text-foreground">{r.name}</div>
                        </div>
                        <span className="tabular shrink-0 text-micro text-muted-foreground">{r.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {assetType === 'Gold' && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2.5">
                <span className="text-ui font-medium text-foreground">{t('assets.goldGram')}</span>
                <span className="tabular text-micro text-muted-foreground">XAU</span>
              </div>
            )}
          </div>
        )}

        {/* Miktar */}
        <div className="space-y-1.5">
          <Label htmlFor="quantity">
            {assetType === 'Gold' ? t('assets.grams') : assetType === 'Currency' ? t('assets.amount') : t('assets.quantity')}
          </Label>
          <MoneyInput
            id="quantity"
            placeholder="0"
            value={quantity}
            onChange={setQuantity}
            required
          />
        </div>

        {/* Alış tarihi — tam ekran fiyatlı takvimi açar */}
        <div className="space-y-1.5">
          <Label>{t('assets.purchaseDate')}</Label>
          <button
            type="button"
            onClick={openCal}
            className="press flex h-12 w-full items-center justify-between rounded-md border border-border bg-card px-3 text-body text-foreground hover:border-foreground"
          >
            <span>{formatDisplayDate(date, lang)}{date === today && <span className="text-muted-foreground"> · {t('buy.todayTag')}</span>}</span>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Birim fiyat + para birimi (altın ve döviz TL'ye kilitli → seçici gizli) */}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="unitPrice">
              {assetType === 'Gold' ? t('assets.pricePerGram') : assetType === 'Currency' ? t('assets.buyRate') : t('assets.purchasePrice')}
            </Label>
            <MoneyInput
              id="unitPrice"
              currency={currency}
              placeholder="0,00"
              value={unitPrice}
              onChange={(v) => { setUnitPrice(v); setPriceSource('manual') }}
              required
            />
          </div>
          {assetType === 'Stock' && (
            <div className="space-y-1.5">
              <Label>{t('assets.currencyLabel')}</Label>
              <div className="flex gap-1.5">
                {currencies.map((c) => (
                  <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={pill(currency === c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fiyatın nereden geldiği — kullanıcı hangi sayıya baktığını bilsin */}
        {refFetching ? (
          <p className="label text-muted-foreground">{t('assets.priceFetching')}</p>
        ) : reference && !reference.available ? (
          <p className="text-micro text-muted-foreground">{t('assets.priceUnavailableOnDate')}</p>
        ) : reference?.available && priceSource === 'auto' ? (
          <p className="label text-muted-foreground">
            {reference.priceKind === 'live'
              ? t('assets.priceFromLive')
              : t('assets.priceFromClose').replace('{date}', formatDisplayDate(reference.effectiveDate, lang))}
            {reference.priceKind === 'close' && reference.effectiveDate !== reference.requestedDate && (
              <span className="ml-1 normal-case tracking-normal">
                · {t('assets.priceFellBack').replace('{requested}', formatDisplayDate(reference.requestedDate, lang))}
              </span>
            )}
          </p>
        ) : priceSource === 'manual' && refPrice != null && tier !== 'none' ? (
          <p className={
            tier === 'confirm' ? 'flex items-center gap-1.5 text-micro text-margin'
            : tier === 'warn' ? 'flex items-center gap-1.5 text-micro text-warn'
            : 'text-micro text-muted-foreground'
          }>
            {tier !== 'info' && <AlertTriangle className="h-3 w-3 shrink-0" />}
            {tier === 'info'
              ? t('assets.deviationInfo').replace('{price}', refPrice.toFixed(2))
              : t('assets.deviationWarn').replace('{price}', refPrice.toFixed(2)).replace('{pct}', pct)}
            <button type="button" onClick={() => { setPriceSource('auto'); setUnitPrice('') }}
              className="ml-1 underline hover:no-underline">
              {t('assets.useThatDayPrice')}
            </button>
          </p>
        ) : refError ? (
          <p className="text-micro text-muted-foreground">{t('assets.priceFetchError')}</p>
        ) : null}

        {/* O gün / bugün karşılaştırması — yalnızca otomatik fiyatta */}
        {priceSource === 'auto' && thenPrice != null && (
          <div className="space-y-2.5 rounded-lg border border-border bg-card p-3.5">
            {date === today ? (
              <div className="flex items-baseline justify-between">
                <span className="text-ui text-muted-foreground">{t('buy.livePrice')}</span>
                <span className="tabular text-body text-foreground">{money(thenPrice)}</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-ui text-muted-foreground">{t('buy.thenPrice')}</span>
                  <span className="tabular text-body text-foreground">{money(thenPrice)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ui text-muted-foreground">{t('buy.nowPrice')}</span>
                  <span className="tabular text-body text-foreground">{nowPrice != null ? money(nowPrice) : '…'}</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-2.5">
                  <span className="label text-muted-foreground">{t('buy.sinceThen')}</span>
                  <span className={cn('tabular text-figure font-semibold', sinceThen == null ? 'text-muted-foreground' : sinceThen >= 0 ? 'text-up' : 'text-down')}>
                    {formatPct(sinceThen)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {totalCost != null && !Number.isNaN(totalCost) && (
          <div className="flex items-baseline justify-between px-0.5">
            <span className="label text-muted-foreground">{t('buy.total')}</span>
            <span className="tabular text-figure font-semibold text-foreground">{money(totalCost)}</span>
          </div>
        )}

        {/* Al: mobilde alt menünün hemen üstüne sabit, masaüstünde formun sonunda */}
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0 md:pt-2">
          <Button type="submit" className="h-12 w-full text-body" disabled={!canBuy}>
            {buyMutation.isPending
              ? '...'
              : quantity
                ? t('buy.cta').replace('{qty}', Number(quantity).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')).replace('{unit}', unitWord)
                : t('assets.buy')}
          </Button>
        </div>
      </form>

      <PriceCalendar
        open={calOpen}
        market={market}
        symbol={symbol}
        assetType={assetType}
        label={assetType === 'Gold' ? t('assets.goldGram') : symbol}
        value={date}
        onClose={closeCal}
        onSelect={(v) => { setDate(v); if (priceSource === 'auto') setUnitPrice(''); closeCal() }}
      />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('assets.confirmPriceTitle')}
        subtitle={symbol}
        actions={
          <>
            <button onClick={() => setConfirmOpen(false)}
              className="w-1/2 border border-foreground py-2.5 font-mono text-micro font-bold uppercase text-foreground hover:bg-secondary">
              {t('common.cancel')}
            </button>
            <button onClick={() => handleSubmit()}
              className="w-1/2 border border-margin bg-margin py-2.5 font-mono text-micro font-bold uppercase text-white hover:opacity-90">
              {t('assets.confirmPriceKeep')}
            </button>
          </>
        }
      >
        <p className="text-center font-mono text-micro text-muted-foreground">
          {t('assets.confirmPriceBody').replace('{pct}', pct)}
        </p>
      </Modal>
    </Page>
  )
}
