import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { marketApi } from '@/services/api'
import { useBuyAsset, usePriceOnDate } from '@/hooks/queries'
import { todayString, toApiDate, formatDisplayDate } from '@/lib/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Page } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { deviationOf } from '@/lib/priceDeviation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, AlertTriangle, Search, X } from 'lucide-react'

const assetTypes = ['Stock', 'Currency', 'Gold']
const currencySymbols = ['USD', 'EUR', 'GBP']
const currencies = ['TRY', 'USD']

export default function AddAsset() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [assetType, setAssetType] = useState('')
  const [symbol, setSymbol] = useState('')
  const [selectedName, setSelectedName] = useState('')
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

  const { data: reference, isFetching: refFetching, isError: refError } = usePriceOnDate(symbol, assetType, date)

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
    setSelectedName(val === 'Gold' ? t('assets.gold') : '')
    // Altın ve döviz her zaman TL ile alınır → para birimi kilitli
    if (val === 'Gold' || val === 'Currency') setCurrency('TRY')
  }

  const handleSelectResult = (r) => {
    setSymbol(r.symbol)
    setSelectedName(r.name)
    setResults([])
    if (r.currency === 'USD' || r.currency === 'TRY') setCurrency(r.currency)
  }

  const handleClearSymbol = () => {
    setSymbol('')
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
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        currency,
        date: toApiDate(date),
      })
      navigate(`/assets?tab=${assetType}`)
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message)
    }
  }

  return (
    <Page
      eyebrow={t('assets.title')}
      title={t('assets.buyAsset')}
      actions={
        <Button variant="ghost" size="icon" onClick={() => navigate('/assets')} aria-label={t('common.cancel')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-body tracking-tight">{t('assets.buyAsset')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-ui text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Asset Type */}
            <div className="space-y-1.5">
              <Label>{t('common.type')}</Label>
              <Select value={assetType} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.type')} />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`assets.${type.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset / Symbol */}
            <div className="space-y-1.5">
              <Label>{assetType ? t(`assets.${assetType.toLowerCase()}`) : t('assets.name')}</Label>

              {assetType === 'Currency' && (
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('assets.name')} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencySymbols.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {assetType === 'Stock' && symbol && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-ui font-medium text-foreground">{symbol}</div>
                    <div className="truncate text-micro text-muted-foreground">{selectedName}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={handleClearSymbol}>
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
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                      {searching && (
                        <div className="px-3 py-2 text-ui text-muted-foreground">{t('common.loading')}</div>
                      )}
                      {!searching && results.map((r) => (
                        <button
                          key={`${r.symbol}-${r.exchange}`}
                          type="button"
                          onClick={() => handleSelectResult(r)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary"
                        >
                          <div className="min-w-0">
                            <div className="text-ui font-medium text-foreground">{r.symbol}</div>
                            <div className="truncate text-micro text-muted-foreground">{r.name}</div>
                          </div>
                          <span className="tabular shrink-0 text-micro text-muted-foreground">{r.exchange}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {assetType === 'Gold' && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2">
                  <span className="text-ui font-medium text-foreground">XAU</span>
                  <span className="text-micro text-muted-foreground">· {t('assets.goldGram')}</span>
                </div>
              )}

              {!assetType && (
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder={t('assets.name')} />
                  </SelectTrigger>
                </Select>
              )}
            </div>

            {/* Quantity */}
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

            {/* Purchase date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">{t('assets.purchaseDate')}</Label>
              <DatePicker
                id="date"
                value={date}
                onChange={(v) => { setDate(v); if (priceSource === 'auto') setUnitPrice('') }}
                clearable={false}
                disabledDates={{ after: new Date() }}
              />
            </div>

            {/* Unit price + currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label>{t('assets.currencyLabel')}</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={assetType === 'Gold' || assetType === 'Currency'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                : tier === 'warn' ? 'flex items-center gap-1.5 text-micro text-brass'
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={buyMutation.isPending || !assetType || !symbol || !quantity || !unitPrice}>
                {buyMutation.isPending ? '...' : t('assets.buy')}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/assets')}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
