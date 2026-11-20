import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDashboard, useHoldings, useMarketOverview, useRecentTransactions } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, GhostAction, PrimaryAction } from '@/components/Page'
import { Section } from '@/components/Section'
import { AreaSpark } from '@/components/AreaSpark'
import { catOf } from '@/lib/assetColors'
import { summarizeCategories, CATEGORY_TYPES } from '@/lib/portfolioCategories'
import { num, pct, pctCls } from '@/components/market/marketFormat'
import { ArrowRight, Lock, MessageCircle, Plus } from 'lucide-react'

const formatTry = (v) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

const formatMoney = (v, currency = 'TRY') =>
  new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)

const formatQty = (v) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(v)

const CATEGORY_LABELS = { Stock: 'assets.stock', Currency: 'assets.currency', Gold: 'assets.gold' }
const TOP_HOLDINGS = 5

// Genel Bakış (A · Pano): net varlık + dağılım, piyasa, en büyük varlıklar, son işlemler,
// en altta "Portföyüne sor" yer tutucusu (yerel model gelene kadar pasif).
// Hepsi mevcut uçlardan gelir. Günlük değişim ve toplam K/Z için dashboard API'sinde alan yok (sonraki adım).
export default function Overview() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: dashboard, isLoading } = useDashboard()
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings()

  const total = dashboard?.totalValueInTry ?? 0
  const count = dashboard?.assetCount ?? 0
  // Kategoriler Portföy sayfasıyla aynı hesaptan: değer, pay, K/Z %
  const cats = summarizeCategories(holdings, CATEGORY_TYPES)
    .map((c) => ({ ...c, ...catOf(c.key), label: t(CATEGORY_LABELS[c.key]) }))
    .sort((a, b) => b.value - a.value)

  return (
    <Page
      title={t('overview.title')}
      actions={
        <>
          <GhostAction onClick={() => navigate('/assets')} aria-label={t('overview.allAssets')}>
            <span className="hidden sm:inline">{t('overview.allAssets')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </GhostAction>
          <PrimaryAction onClick={() => navigate('/assets/buy')}>
            <Plus className="h-3.5 w-3.5" />
            {t('assets.buy')}
          </PrimaryAction>
        </>
      }
    >
      {isLoading || holdingsLoading ? (
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {/* Ana KPI: net varlık + dağılım (renk yalnızca ayırt eder) */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
              <div className="label text-muted-foreground">{t('overview.netWorth')}</div>
              <div className="tabular my-1 text-title font-bold text-foreground">{formatTry(total)}</div>
              <div className="tabular text-micro font-medium text-muted-foreground">
                {count} {t('overview.assetCount')}
              </div>

              <div className="mt-5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary">
                {cats.filter((c) => c.share > 0).map((c) => (
                  <div key={c.key} className={`h-full ${c.dot}`} style={{ width: `${c.share * 100}%` }} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {cats.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <div className="tabular flex items-center gap-1.5 text-micro text-muted-foreground">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                      <span className="truncate">{c.label} · %{(c.share * 100).toFixed(0)}</span>
                    </div>
                    <div className="tabular truncate text-body font-semibold text-foreground">{formatTry(c.value)}</div>
                    {c.changePct != null && (
                      <div className={`tabular text-micro font-semibold ${pctCls(c.changePct)}`}>{pct(c.changePct)}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <MarketCard />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <TopHoldings holdings={holdings} total={total} />
            <RecentTransactions />
          </div>

          <AskPlaceholder />
        </div>
      )}
    </Page>
  )
}

// Piyasa özeti: BIST 100, USD/TRY, gram altın — Piyasa sayfasıyla aynı sorgu (önbellek ortak)
function MarketCard() {
  const { t } = useLanguage()
  const { data } = useMarketOverview()
  const rows = [
    { label: 'BIST 100', q: data?.indices?.find((i) => i.symbol === 'XU100.IS') },
    { label: 'USD/TRY', q: data?.strip?.find((q) => q.symbol === 'USD') },
    { label: t('overview.gramGold'), q: data?.strip?.find((q) => q.symbol === 'XAU') },
  ].filter((r) => r.q)

  return (
    <Section
      title={t('overview.market')}
      action={<Link to="/market" className="text-ui font-semibold text-primary hover:underline">{t('overview.goToMarket')}</Link>}
    >
      <div className="px-4 pb-2">
        {rows.length === 0 ? (
          <Skeleton className="mb-2 h-32 w-full" />
        ) : (
          rows.map(({ label, q }) => (
            <div key={label} className="flex min-h-[52px] items-center gap-3 border-b border-border py-2 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-ui font-semibold text-foreground">{label}</div>
                <div className="tabular text-micro text-muted-foreground">{num(q.price)}</div>
              </div>
              <AreaSpark
                values={q.spark ?? []}
                color={`hsl(var(${(q.changePercent ?? 0) >= 0 ? '--up' : '--down'}))`}
                className="h-6 w-16 shrink-0"
              />
              <span className={`tabular w-16 shrink-0 text-right text-ui font-semibold ${pctCls(q.changePercent)}`}>
                {pct(q.changePercent)}
              </span>
            </div>
          ))
        )}
      </div>
    </Section>
  )
}

// En büyük varlıklar (değere göre ilk 5). K/Z alış para birimindedir (USD ile alınan USD gösterir).
function TopHoldings({ holdings, total }) {
  const { t } = useLanguage()
  const top = [...holdings].sort((a, b) => (b.valueInTry ?? 0) - (a.valueInTry ?? 0)).slice(0, TOP_HOLDINGS)

  return (
    <Section
      title={t('overview.holdings')}
      meta={t('overview.byValue')}
      action={<Link to="/assets" className="text-ui font-semibold text-primary hover:underline">{t('overview.all')}</Link>}
    >
      {top.length === 0 ? (
        <p className="px-4 pb-4 text-ui text-muted-foreground">{t('portfolio.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabular w-full text-ui">
            <thead>
              <tr className="label text-right text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">{t('overview.colAsset')}</th>
                <th className="hidden px-2 py-2 font-semibold md:table-cell">{t('overview.colQty')}</th>
                <th className="px-2 py-2 font-semibold">{t('overview.colValue')}</th>
                <th className="hidden px-2 py-2 font-semibold sm:table-cell">{t('overview.colShare')}</th>
                <th className="px-4 py-2 font-semibold">{t('overview.colPl')}</th>
              </tr>
            </thead>
            <tbody className="text-right">
              {top.map((h) => {
                const c = catOf(h.assetType)
                const pl = h.unrealizedProfitLoss
                return (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-left">
                      <div className="flex min-h-[32px] items-center gap-2.5">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-micro font-bold ${c.tint} ${c.text}`}>
                          {h.symbol.slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground">{h.symbol}</div>
                          <div className="truncate text-micro text-foreground">{t(CATEGORY_LABELS[h.assetType] ?? 'assets.currency')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-2 py-2.5 text-foreground md:table-cell">{formatQty(h.quantity)}</td>
                    <td className="px-2 py-2.5 font-semibold text-foreground">{h.priceAvailable ? formatTry(h.valueInTry) : '—'}</td>
                    <td className="hidden px-2 py-2.5 text-muted-foreground sm:table-cell">
                      {total > 0 && h.priceAvailable ? `%${((h.valueInTry / total) * 100).toFixed(0)}` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 font-semibold ${pl > 0 ? 'text-up' : pl < 0 ? 'text-down' : 'text-muted-foreground'}`}>
                      {pl != null ? `${pl > 0 ? '+' : ''}${formatMoney(pl, h.currency)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// Son işlemler: en yeni 5 alış/satış
function RecentTransactions() {
  const { t, lang } = useLanguage()
  const { data: items = [], isLoading } = useRecentTransactions(5)
  const date = (d) => new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'short' })

  return (
    <Section
      title={t('overview.recent')}
      action={<Link to="/assets" className="text-ui font-semibold text-primary hover:underline">{t('overview.all')}</Link>}
    >
      <div className="px-4 pb-2">
        {isLoading ? (
          <Skeleton className="mb-2 h-40 w-full" />
        ) : items.length === 0 ? (
          <p className="pb-2 text-ui text-muted-foreground">{t('overview.noTx')}</p>
        ) : (
          items.map((tx) => (
            <div key={tx.id} className="flex min-h-[52px] items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="truncate text-ui font-semibold text-foreground">
                  {t(tx.type === 'AssetSell' ? 'overview.txSell' : 'overview.txBuy').replace('{symbol}', tx.symbol ?? '')}
                </div>
                <div className="tabular truncate text-micro text-muted-foreground">
                  {date(tx.date)}
                  {tx.quantity != null && tx.unitPrice != null && ` · ${formatQty(tx.quantity)} × ${formatMoney(tx.unitPrice, tx.currency)}`}
                </div>
              </div>
              <div className="tabular shrink-0 text-ui font-semibold text-foreground">{formatMoney(tx.amount, tx.currency)}</div>
            </div>
          ))
        )}
      </div>
    </Section>
  )
}

// Yerel model ile soru-cevap: henüz yok. Yalnız yer tutucu; örnek cevap gösterilmez.
function AskPlaceholder() {
  const { t } = useLanguage()
  const questions = ['overview.askQ1', 'overview.askQ2', 'overview.askQ3']

  return (
    <section className="rounded-xl border border-dashed border-border p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-body font-semibold text-foreground">{t('overview.ask')}</h2>
            <p className="text-ui text-muted-foreground">{t('overview.askHint')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip-neutral inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-micro font-semibold">
            <Lock className="h-3 w-3" />
            {t('overview.localModel')}
          </span>
          <span className="chip-neutral rounded-sm px-2 py-0.5 text-micro font-semibold">{t('market.soon')}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((k) => (
          <button key={k} type="button" disabled className="h-8 cursor-not-allowed rounded-full border border-border px-3 text-ui text-muted-foreground">
            {t(k)}
          </button>
        ))}
      </div>

      <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="overview-ask" className="sr-only">{t('overview.ask')}</label>
        <input
          id="overview-ask"
          type="text"
          disabled
          autoComplete="off"
          inputMode="text"
          placeholder={t('overview.askPlaceholder')}
          className="h-12 min-w-0 flex-1 cursor-not-allowed rounded-[10px] border border-border bg-card px-3 text-body text-foreground placeholder:text-muted-foreground"
        />
        <button type="submit" disabled className="h-12 cursor-not-allowed rounded-[10px] bg-secondary px-4 text-ui font-semibold text-muted-foreground">
          {t('overview.askSend')}
        </button>
      </form>

      <div className="mt-4 border-t border-border pt-3 text-micro text-muted-foreground">{t('overview.askNote')}</div>
    </section>
  )
}
